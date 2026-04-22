import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create dev user for H5 mock login
  const existing = await prisma.user.findUnique({ where: { id: 'dev-user' } })
  if (!existing) {
    await prisma.user.create({
      data: {
        id: 'dev-user',
        openId: 'dev-openid-h5',
        nickname: 'H5测试用户',
        avatar: '',
        subscriptionTier: 'free',
      },
    })
    console.log('Created dev user for H5 mock login')
  }
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(() => prisma.$disconnect())
