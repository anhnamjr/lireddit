import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import path from "path";
import { Post, User } from "./entities";

export default {
  migrations: {
    path: path.join(__dirname, "./migration"), // path to the folder with migrations
    pattern: /^[\w-]+\d+\.[jt]s$/, // regex pattern for the migration files
  },
  entities: [Post, User],
  dbName: "lireddit",
  type: "postgresql",
  user: "postgres",
  password: "123456",
  host: "host.docker.internal",
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
