import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAddonDto {
  @ApiProperty({ example: 'b3a45e22-...', description: 'Menu item ID' })
  @IsUUID()
  menuItemId: string;

  @ApiProperty({ example: 'Garlic Sauce', description: 'Addon name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 5.5, description: 'Addon price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;
}
