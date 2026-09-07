import {
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class FirstLoginChangePasswordDto {
  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'newPassword must contain at least one letter and one number',
  })
  newPassword!: string;

  @IsString()
  @Length(8, 128)
  confirmPassword!: string;
}
