<script lang="ts" setup>
import {createAppKit, useAppKitAccount} from '@reown/appkit/vue'
import { arbitrum, mainnet, polygon, base, scroll, type AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

import { createSIWE  } from './utils/siweUtils'
import {onBeforeMount, onMounted, ref} from "vue";

// 1. Get projectId at https://cloud.reown.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");

// 2. Create metadata
const metadata = {
  name: "AppKit SIWE",
  description: "AppKit SIWE Example",
  url: "https://reown.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 3. Set the networks
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum, base, scroll, polygon]

const log = ref<string[]>([]);

const message = 'Sign in to continue';

// 5. Create a SIWE configuration object
const siweConfig = createSIWE(networks, message, () => {
  log.value = [...log.value, 'Connected to SIWE at ' + new Date().toLocaleTimeString()];
});


// 6. Create modal
const modal = createAppKit({
  features: {
    socials: [],
    email: false,
    analytics: false,
  },
  adapters: [
    new WagmiAdapter({
      projectId: projectId,
      networks,
    }),
  ],
  networks: networks,
  projectId: projectId,
  siweConfig,
});

const account = useAppKitAccount()
</script>

<template>
  <div>
    <button @click="modal.open">Open Modal</button>
    <div>Account Status: {{ account.status }}</div>
    <div v-for="l in log" :key="l">{{ l }}</div>
  </div>
</template>