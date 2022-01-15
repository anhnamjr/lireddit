import { validateEmail } from "./validateEmail";
import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";

export const validateRegister = ({
  email,
  username,
  password,
}: UsernamePasswordInput) => {
  if (!email) {
    return [
      {
        field: "email",
        message: "Email must not be empty",
      },
    ];
  }
  if (!validateEmail(email)) {
    //validate invalid email
    return [
      {
        field: "email",
        message: "Invalid email",
      },
    ];
  }
  if (!username) {
    return [
      {
        field: "username",
        message: "Username must not be empty",
      },
    ];
  }

  if (username.length < 2) {
    return [
      {
        field: "username",
        message: "Username length must be greater than 2",
      },
    ];
  }

  if (username.includes("@")) {
    return [
      {
        field: "username",
        message: "Username must not include @",
      },
    ];
  }
  if (!password) {
    return [
      {
        field: "password",
        message: "Password must not be empty",
      },
    ];
  }

  if (password.length < 2) {
    return [
      {
        field: "Password",
        message: "Password length must be greater than 2",
      },
    ];
  }
  return null;
};
