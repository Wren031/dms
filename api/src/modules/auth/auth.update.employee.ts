// import { Prisma } from "@prisma/client";

// import { PrismaService } from "@/prisma/prisma.service";
// import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
// import { ConfigService } from "@nestjs/config";
// import { JwtService } from "@nestjs/jwt";
// import { UpdateMyProfileDto } from "./dto/update-my-profile.dto";
// import { AuthenticatedUserDto } from "./dto/authenticated-user.dto";


// type AuthUserWithEmployee = Prisma.UserGetPayload<{
//   include: {
//     employee: {
//       select: {
//         id: true;
//         officeId: true;
//         position: true;
//         firstName: true;
//         middleName: true;
//         lastName: true;
//         phone: true;
//         email: true;
//       };
//     };
//   };
// }>;


// @Injectable()
// export class AuthEmployeeUpdate {
//     constructor (
//     private readonly prisma: PrismaService,
//     private readonly configService: ConfigService,
//     private readonly jwtService: JwtService,
//     ){}

//       async updateMe(userId: string, dto: UpdateMyProfileDto): Promise<AuthenticatedUserDto> {
//         const email = dto.email.trim().toLowerCase();
    
//         const existing = await this.prisma.user.findUnique({
//           where: { id: userId },
//           include: { employee: { select: { id: true } } },
//         });
//         if (!existing) {
//           throw new UnauthorizedException('Invalid session');
//         }
    
//         if (!existing.employee) {
//           throw new BadRequestException('No employee record is linked to this account');
//         }
    
//         if (email !== (existing.email ?? '').toLowerCase()) {
//           const userEmailTaken = await this.prisma.user.findFirst({
//             where: { email, NOT: { id: userId } },
//             select: { id: true },
//           });
//           if (userEmailTaken) {
//             throw new ConflictException('Email is already used by another account');
//           }
//           const employeeEmailTaken = await this.prisma.employee.findFirst({
//             where: { email, NOT: { id: existing.employee.id } },
//             select: { id: true },
//           });
//           if (employeeEmailTaken) {
//             throw new ConflictException('Email is already used by another employee record');
//           }
//         }
    
//         const [updatedUser] = await this.prisma.$transaction([
//           this.prisma.user.update({
//             where: { id: userId },
//             data: { email },
//             include: { employee: { select: employeeSelect } },
//           }),
//           this.prisma.employee.update({
//             where: { id: existing.employee.id },
//             data: {
//               firstName: dto.firstName.trim(),
//               middleName: dto.middleName?.trim() ? dto.middleName.trim() : null,
//               lastName: dto.lastName.trim(),
//               position: dto.position.trim(),
//               email,
//               phone: dto.phone?.trim() ? dto.phone.trim() : null,
//             },
//           }),
//         ]);
    
//         return this.toUserDto(updatedUser);
//       }

//       private toUserDto(user: AuthUserWithEmployee): AuthenticatedUserDto {
//         return {
//           id: user.id,
//           email: user.email,
//           username: user.username,
//           role: user.role,
//           status: user.status,
//           officeId: user.employee?.officeId ?? null,
//           position: user.employee?.position ?? null,
//           employeeId: user.employee?.id ?? null,
//           firstName: user.employee?.firstName ?? null,
//           middleName: user.employee?.middleName ?? null,
//           lastName: user.employee?.lastName ?? null,
//           phone: user.employee?.phone ?? null,
//           avatarColor: null,
//           createdAt: user.createdAt,
//         };
//       }
// }
