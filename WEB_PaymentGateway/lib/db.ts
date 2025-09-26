import mongoose from "mongoose";

const rawUri = process.env.MONGODB_URI;

if (!rawUri) {
  throw new Error("MONGODB_URI tidak ditemukan di environment");
}

const connectionUri: string = rawUri;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

function getCache(): MongooseCache {
  if (!global.mongooseCache) {
    global.mongooseCache = { conn: null, promise: null };
  }
  return global.mongooseCache;
}

export async function dbConnect() {
  const cache = getCache();
  if (cache.conn) {
    return cache.conn;
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(connectionUri, {
      maxPoolSize: 10
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
