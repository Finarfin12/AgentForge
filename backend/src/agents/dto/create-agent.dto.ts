import { IsString, IsOptional, IsArray, IsInt, IsBoolean, MaxLength, MinLength, IsObject, IsUUID } from 'class-validator';

export class CreateAgentDto {
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @IsString() @MaxLength(255)
  displayName: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  avatarUrl?: string;

  @IsOptional() @IsArray()
  capabilities?: string[];

  @IsOptional() @IsObject()
  config?: Record<string, unknown>;

  @IsOptional() @IsUUID()
  runtimeId?: string;

  @IsOptional() @IsInt()
  maxConcurrentTasks?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsArray()
  skillIds?: string[];
}
