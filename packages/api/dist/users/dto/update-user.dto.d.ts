import { CreateUserDto } from './create-user.dto';
declare const UpdateUserDto_base: import("@nestjs/mapped-types").MappedType<Partial<Omit<CreateUserDto, "email">>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
    avatar?: string;
}
export {};
