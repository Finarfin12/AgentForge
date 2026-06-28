import { IsString, MinLength, MaxLength, IsOptional, IsInt, IsNumber, Min, Max, IsArray, ValidateNested, ArrayMaxSize, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(10000)
  content: string;
}

export class InvokeAgentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  prompt: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(128000)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
