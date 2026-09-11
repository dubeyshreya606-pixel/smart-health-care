import mongoose from "mongoose";

export async function connectDB() {
  const primaryUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  try {
    await mongoose.connect(primaryUri);
    console.log("MongoDB connected");
  } catch (err) {
    if (primaryUri && primaryUri.includes("xxxxx")) {
      console.warn("MongoDB Atlas placeholder detected (cluster0.xxxxx). Falling back to local MongoDB...");
      await mongoose.connect("mongodb://127.0.0.1:27017/smart_healthcare");
      console.log("MongoDB connected (local fallback)");
    } else {
      throw err;
    }
  }
}


