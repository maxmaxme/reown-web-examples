import NextAuth from 'next-auth';
import credentialsProvider from 'next-auth/providers/credentials';
import {
  type SIWESession,
} from '@reown/appkit-siwe'
import {SiweMessage} from 'siwe';

declare module 'next-auth' {
  interface Session extends SIWESession {
    address: string;
    chainId: number;
  }
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET is not set');
}

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not set');
}

const providers = [
  credentialsProvider({
    name: 'Ethereum',
    credentials: {
      message: {
        label: 'Message',
        type: 'text',
        placeholder: '0x0',
      },
      signature: {
        label: 'Signature',
        type: 'text',
        placeholder: '0x0',
      },
    },
    async authorize(credentials) {
        if (!credentials?.message) {
          throw new Error('SiweMessage is undefined');
        }

        let SIWEObject = new SiweMessage(credentials.message);
        const isValid = await SIWEObject.verify({signature: credentials.signature});

        return {
          id: `${isValid.data.chainId}:${isValid.data.address}`
        }
    },
  }),
];

const handler = NextAuth({
  // https://next-auth.js.org/configuration/providers/oauth
  secret: nextAuthSecret,
  providers,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    session({ session, token }) {
      if (!token.sub) {
        return session;
      }

      const [, chainId, address] = token.sub.split(':');
      if (chainId && address) {
        session.address = address;
        session.chainId = parseInt(chainId, 10);
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
