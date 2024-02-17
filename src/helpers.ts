import { NextFunction, Request, Response } from "express"
import { HttpException } from "./httpException"
import { z } from "zod"


export const ErrorMiddleware = (error: HttpException, req: Request, res: Response, next: NextFunction) => {
    try {
        const status: number = error.status || 500;
        const message: string = error.message || 'Something went wrong';

        return res.status(status).json({ message });
    } catch (error) {
        next(error);
    }
};

export const validator = (req: Request, res: Response, next: NextFunction) => {
    try {

        const payloadSchema = z.object({
            action: z.string(),
            pull_request: z.object({
                html_url: z.string(),
            }),
            review: z.object({
                state: z.string(),
            }),
            repository: z.object({
                name: z.string(),
            })

        })

        const validationResult = payloadSchema.safeParse(req.body)

        if (!validationResult.success)
            throw new HttpException(400, "Bad request body")
        next()
    } catch (e) {
        next(e)
    }
} 