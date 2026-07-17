import { Controller, Get, Module } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../auth/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("cities")
@Controller("cities")
export class CitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Cities, live first" })
  async list() {
    const cities = await this.prisma.city.findMany({ orderBy: { launchOrder: "asc" } });
    return cities.map((city) => ({
      slug: city.slug,
      name: city.name,
      state: city.state,
      is_live: city.isLive,
    }));
  }
}

@Module({ controllers: [CitiesController] })
export class CitiesModule {}
