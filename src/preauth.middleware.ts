import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PreauthMiddleware implements NestMiddleware {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization;
    if (
      token != null &&
      token != '' &&
      token.replace('Bearer ', '') === process.env.API_KEY
    ) {
      next();
    } else {
      this.accessDenied(req.url, res);
    }
  }

  private accessDenied(url: string, res: Response) {
    res.status(403).json({
      statusCode: 403,
      timestamp: new Date().toISOString(),
      path: url,
      message: 'Access Denied',
    });
  }
}
