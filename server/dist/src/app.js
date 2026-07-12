import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.get("/api/v1/health", (_request, response) => {
    response.status(200).json({
        success: true,
        message: "TaskFlow API is running.",
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/v1/auth", authRouter);
app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({
        success: false,
        message: "Internal server error.",
    });
});
export default app;
