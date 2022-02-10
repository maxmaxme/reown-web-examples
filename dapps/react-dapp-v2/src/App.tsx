import React, { useEffect, useState } from "react";
import { version } from "@walletconnect/client/package.json";

import Banner from "./components/Banner";
import Blockchain from "./components/Blockchain";
import Column from "./components/Column";
import Header from "./components/Header";
import Modal from "./components/Modal";
import { DEFAULT_MAIN_CHAINS, DEFAULT_TEST_CHAINS } from "./constants";
import { AccountAction, getLocalStorageTestnetFlag, setLocaleStorageTestnetFlag } from "./helpers";
import Toggle from "./components/Toggle";
import RequestModal from "./modals/RequestModal";
import PairingModal from "./modals/PairingModal";
import PingModal from "./modals/PingModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SConnectButton,
  SContent,
  SLanding,
  SLayout,
  SToggleContainer,
} from "./components/app";
import { useWalletConnectClient } from "./contexts/ClientContext";
import { useJsonRpc } from "./contexts/JsonRpcContext";

export default function App() {
  const [isTestnet, setIsTestnet] = useState(getLocalStorageTestnetFlag());

  const [modal, setModal] = useState("");

  const closeModal = () => setModal("");
  const openPairingModal = () => setModal("pairing");
  const openPingModal = () => setModal("ping");
  const openRequestModal = () => setModal("request");

  // Initialize the WalletConnect client.
  const {
    client,
    session,
    connect,
    disconnect,
    chains,
    accounts,
    balances,
    fetching,
    loading,
    setChains,
  } = useWalletConnectClient();

  // Use `JsonRpcContext` to provide us with relevant RPC methods and states.
  const { chainData, ping, ethereumRpc, cosmosRpc, isRpcRequestPending, rpcResult } = useJsonRpc();

  // Close the pairing modal after a session is established.
  useEffect(() => {
    if (session && modal === "pairing") {
      closeModal();
    }
  }, [session, modal]);

  const onConnect = () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    // Suggest existing pairings (if any).
    if (client.pairing.topics.length) {
      return openPairingModal();
    }
    // If no existing pairings are available, trigger `WalletConnectClient.connect`.
    connect();
  };

  const onPing = async () => {
    openPingModal();
    await ping();
  };

  const getEthereumActions = (): AccountAction[] => {
    const onSendTransaction = async (chainId: string) => {
      openRequestModal();
      await ethereumRpc.testSendTransaction(chainId);
    };
    const onSignPersonalMessage = async (chainId: string) => {
      openRequestModal();
      await ethereumRpc.testSignPersonalMessage(chainId);
    };
    const onSignTypedData = async (chainId: string) => {
      openRequestModal();
      await ethereumRpc.testSignTypedData(chainId);
    };

    return [
      { method: "eth_sendTransaction", callback: onSendTransaction },
      { method: "personal_sign", callback: onSignPersonalMessage },
      { method: "eth_signTypedData", callback: onSignTypedData },
    ];
  };

  const getCosmosActions = (): AccountAction[] => {
    const onSignDirect = async (chainId: string) => {
      openRequestModal();
      await cosmosRpc.testSignDirect(chainId);
    };
    const onSignAmino = async (chainId: string) => {
      openRequestModal();
      await cosmosRpc.testSignAmino(chainId);
    };
    return [
      { method: "cosmos_signDirect", callback: onSignDirect },
      { method: "cosmos_signAmino", callback: onSignAmino },
    ];
  };

  const getBlockchainActions = (chainId: string) => {
    const [namespace] = chainId.split(":");
    switch (namespace) {
      case "eip155":
        return getEthereumActions();
      case "cosmos":
        return getCosmosActions();
      default:
        break;
    }
  };

  const toggleTestnets = () => {
    const nextIsTestnetState = !isTestnet;
    setIsTestnet(nextIsTestnetState);
    setLocaleStorageTestnetFlag(nextIsTestnetState);
  };

  const handleChainSelectionClick = (chainId: string) => {
    if (chains.includes(chainId)) {
      setChains(chains.filter(chain => chain !== chainId));
    } else {
      setChains([...chains, chainId]);
    }
  };

  const renderModal = () => {
    switch (modal) {
      case "pairing":
        if (typeof client === "undefined") {
          throw new Error("WalletConnect is not initialized");
        }
        return <PairingModal pairings={client.pairing.values} connect={connect} />;
      case "request":
        return <RequestModal pending={isRpcRequestPending} result={rpcResult} />;
      case "ping":
        return <PingModal pending={isRpcRequestPending} result={rpcResult} />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    const chainOptions = isTestnet ? DEFAULT_TEST_CHAINS : DEFAULT_MAIN_CHAINS;
    return !accounts.length && !Object.keys(balances).length ? (
      <SLanding center>
        <Banner />
        <h6>
          <span>{`Using v${version || "2.0.0-beta"}`}</span>
        </h6>
        <SButtonContainer>
          <h6>Select chains:</h6>
          <SToggleContainer>
            <p>Testnets Only?</p>
            <Toggle active={isTestnet} onClick={toggleTestnets} />
          </SToggleContainer>
          {chainOptions.map(chainId => (
            <Blockchain
              key={chainId}
              chainId={chainId}
              chainData={chainData}
              onClick={handleChainSelectionClick}
              active={chains.includes(chainId)}
            />
          ))}
          <SConnectButton left onClick={onConnect} fetching={fetching} disabled={!chains.length}>
            {"Connect"}
          </SConnectButton>
        </SButtonContainer>
      </SLanding>
    ) : (
      <SAccountsContainer>
        <h3>Accounts</h3>
        <SAccounts>
          {accounts.map(account => {
            const [namespace, reference, address] = account.split(":");
            const chainId = `${namespace}:${reference}`;
            return (
              <Blockchain
                key={account}
                active={true}
                chainData={chainData}
                fetching={fetching}
                address={address}
                chainId={chainId}
                balances={balances}
                actions={getBlockchainActions(chainId)}
              />
            );
          })}
        </SAccounts>
      </SAccountsContainer>
    );
  };

  return (
    <SLayout>
      <Column maxWidth={1000} spanHeight>
        <Header ping={onPing} disconnect={disconnect} session={session} />
        <SContent>{loading ? "Loading..." : renderContent()}</SContent>
      </Column>
      <Modal show={!!modal} closeModal={closeModal}>
        {renderModal()}
      </Modal>
    </SLayout>
  );
}
