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

function getReadyState(conn: typeof mongoose | null) {
  return conn?.connection.readyState ?? 0;
}

export async function dbConnect() {
  const cache = getCache();
  const readyState = getReadyState(cache.conn);
  if (readyState === 1) {
    return cache.conn!;
  }
  if (readyState === 2 && cache.promise) {
    cache.conn = await cache.promise;
    return cache.conn;
  }
  if (readyState === 0 || readyState === 3) {
    cache.conn = null;
    cache.promise = null;
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(connectionUri, {
      maxPoolSize: 10
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
