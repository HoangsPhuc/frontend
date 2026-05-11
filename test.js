const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Transactions:');
  console.dir(txs, { depth: null });
  
  const accs = await prisma.bankAccount.findMany({
    include: { transactions: true }
  });
  console.log('\nBank Accounts:');
  console.dir(accs, { depth: null });
}

main().finally(() => prisma.$disconnect());
