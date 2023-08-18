import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AccountService } from 'src/account/account.service';
import { UserService } from 'src/user/user.service';
import { Decimal } from '@prisma/client/runtime/library';
import { SoldAccountDto } from './dto/sold-account.dto';
import { decryptPassword } from 'src/account/utils/cryptPassword';
import { Transaction, UserTransaction } from '@prisma/client';
import { ReturnFindDto } from './dto/return-find.dto';

@Injectable()
export class TransactionService {
  constructor(
    private prisma: PrismaService,
    private accountService: AccountService,
    private userService: UserService,
  ) { }

  async create(createTransactionDto: CreateTransactionDto): Promise<SoldAccountDto> {
    const account = await this.accountService.findOne(createTransactionDto.accountId);
    const { balance } = await this.userService.findOne(createTransactionDto.userId);
    const newBalance = Decimal.sub(balance, account.price);

    if (newBalance.lessThanOrEqualTo(0)) {
      throw new BadRequestException();
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        payeeId: account.ownerId,
        accountId: account.id,
        ammount: account.price,
      }
    })

    const userTransaction = await this.prisma.userTransaction.create({
      data: {
        userId: createTransactionDto.userId,
        transactionId: transaction.id,
      }
    })

    if (!transaction || !userTransaction) {
      throw new BadRequestException();
    }

    await this.userService.update(createTransactionDto.userId, { balance: newBalance })
    await this.accountService.update(account.id, { sold: true })

    const decryptedPassword: string = decryptPassword(account.password);

    const soldAccount: SoldAccountDto = {
      username: account.username,
      email: account.email,
      password: decryptedPassword,
    }

    return soldAccount;
  }

  async findById(id: string): Promise<ReturnFindDto> {
    const received = await this.prisma.transaction.findMany({ where: { id } });
    const sent = await this.prisma.userTransaction.findMany({ where: { id } });

    return {
      receivedTransactions: received,
      sentTransactions: sent,
    }
  }
}
