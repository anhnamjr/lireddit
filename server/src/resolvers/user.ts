import { validateEmail } from "./../utils/validateEmail";
import { validateRegister } from "./../utils/validateRegister";
import { User } from "./../entities/User";
import { MyContext } from "./../type";
import {
  Resolver,
  Mutation,
  Arg,
  Field,
  Ctx,
  ObjectType,
  Query,
} from "type-graphql";
import argon2 from "argon2";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, em, req }: MyContext
  ): Promise<UserResponse> {
    const key = `${FORGET_PASSWORD_PREFIX}${token}`;
    const userId = await redis.get(key);

    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "Invalid token",
          },
        ],
      };
    }

    if (!newPassword) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "New password must not be empty",
          },
        ],
      };
    }
    if (newPassword.length < 2) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "New password length must greater than 2",
          },
        ],
      };
    }
    const hashedNewPassword = await argon2.hash(newPassword);

    const user = await em.findOne(User, { id: parseInt(userId) });

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists",
          },
        ],
      };
    }

    user.password = hashedNewPassword;
    await em.persistAndFlush(user);

    await redis.del(key);

    // log in user after change password
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = await em.findOne(User, { email });

    if (!user) {
      // email doesn't exist in db
      return false;
    }

    const token = v4();

    const key = `${FORGET_PASSWORD_PREFIX}${token}`;
    await redis.set(
      key,
      user.id,
      "PX",
      1000 * 60 * 5 // 5 minutes
    );

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">Change password</a>`
    );

    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    const meId = req.session.userId;

    if (!meId) {
      return null;
    }

    return await em.findOne(User, { id: meId });
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") { username, password, email }: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister({ username, password, email });

    if (errors) {
      return {
        errors,
      };
    }

    const hashedPassword = await argon2.hash(password);
    let user;
    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          username,
          password: hashedPassword,
          email,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
      user = result[0];
    } catch (err) {
      // Duplicate username error
      if (err.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "Username is already exist",
            },
          ],
        };
      }
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      validateEmail(usernameOrEmail)
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );
    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "Username or Email doesn't exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "Incorrect password",
          },
        ],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        res.clearCookie(COOKIE_NAME);
        resolve(true);
      })
    );
  }
}
