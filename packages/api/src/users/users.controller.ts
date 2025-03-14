import { Controller, Get, Param, UseGuards, Put, Body, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    return this.usersService.updateProfile(req.user._id, updateUserDto);
  }
}
