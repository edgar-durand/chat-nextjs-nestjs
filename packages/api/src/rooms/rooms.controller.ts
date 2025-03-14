import { Controller, Get, Post, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Room } from './schemas/room.schema';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto, @Request() req): Promise<Room> {
    return this.roomsService.create(createRoomDto, req.user);
  }

  @Get()
  findAll(): Promise<Room[]> {
    return this.roomsService.findAll();
  }

  @Get('my')
  findUserRooms(@Request() req): Promise<Room[]> {
    return this.roomsService.findUserRooms(req.user._id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Room> {
    return this.roomsService.findOne(id);
  }

  @Post(':id/members/:userId')
  addMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<Room> {
    return this.roomsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<Room> {
    return this.roomsService.removeMember(id, userId);
  }
}
