import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User>;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<User>;
}
