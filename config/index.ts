import mongoose from 'mongoose'
import dotenv from 'dotenv';
import { Connection, ConnectionConfig } from '@solana/web3.js';
dotenv.config()

import dataJson from '../data.json'

export const TELEGRAM_ACCESS_TOKEN: string = process.env.TELEGRAM_ACCESS_TOKEN ? process.env.TELEGRAM_ACCESS_TOKEN : "";

// export const MONGO_URL = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`;
export const MONGO_URL = `mongodb+srv://thrillseekernw:cBhYUXugf9itpofl@cluster0.zsstj4i.mongodb.net/shicatbots?retryWrites=true&w=majority`;

export const CLUSTER: string = 'mainnet'

export const RPC_MAINNET_URL = 'https://mainnet.helius-rpc.com/?api-key=f74ec75c-56ba-49df-b67b-71637bf8d115'
export const RPC_DEVNET_URL = 'https://api.devnet.solana.com'

export const RPC_WEBSOCKET_URL = 'wss://mainnet.helius-rpc.com/?api-key=f74ec75c-56ba-49df-b67b-71637bf8d115'
// export const solConnection: any = new Connection(RPC_MAINNET_URL, { wss: RPC_WEBSOCKET_URL }
// );

// @ts-ignore
export const solConnection = new Connection(RPC_MAINNET_URL, {wss: RPC_WEBSOCKET_URL})

export const BOT_NAME = "Wiz Trading Bot"

export const connectDb = async () => {
  let isConnected = false;

  const connect = async () => {
    try {
      if (MONGO_URL) {

        // Connect to MongoDB
        mongoose.connect(MONGO_URL)
          .then((connection) => console.log(`MONGODB CONNECTED : ${MONGO_URL}   ${connection.connection.host}`))
          .catch(err => console.error('MongoDB connection error:', err));

        isConnected = true;
      } else {
        console.log('No Mongo URL');
      }
    } catch (error) {
      console.log(`Error : ${(error as Error).message}`);
      isConnected = false;
      // Attempt to reconnect
      setTimeout(connect, 1000); // Retry connection after 1 seconds
    }
  };

  connect();

  mongoose.connection.on('disconnected', () => {
    console.log('MONGODB DISCONNECTED');
    isConnected = false;
    // Attempt to reconnect
    setTimeout(connect, 1000); // Retry connection after 5 seconds
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MONGODB RECONNECTED');
    isConnected = true;
  });
};

export const UserCache = dataJson
export const IS_FEE_SET = process.env.IS_FEE_SET ? process.env.IS_FEE_SET : false
export const FEE_AMOUNT = 0.75 // percent
