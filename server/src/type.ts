import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from "express";
import session from "express-session";
import { Redis } from "ioredis";

export type MyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  res: Response<any>;
  req: Request<any> & { session: session.Session & { userId: number } };
  redis: Redis;
};
