import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Try to get school slug from subdomain first
    const host = req.headers.host || '';
    const parts = host.split('.');
    let schoolSlug: string | null = null;

    if (parts.length >= 3) {
      // subdomain.domain.com
      schoolSlug = parts[0];
    }

    // Fallback: header (for localhost development)
    if (!schoolSlug || schoolSlug === 'localhost' || schoolSlug === 'www' || schoolSlug === 'platform') {
      schoolSlug = req.headers['x-school-slug'] as string || null;
    }

    // Fallback: query parameter
    if (!schoolSlug) {
      schoolSlug = req.query['school'] as string || null;
    }

    if (schoolSlug && schoolSlug !== 'platform') {
      const school = await this.prisma.school.findUnique({
        where: { slug: schoolSlug },
        select: { id: true, slug: true, name: true, isActive: true },
      });

      if (school && school.isActive) {
        (req as any).school = school;
        (req as any).schoolId = school.id;
      }
    }

    next();
  }
}
