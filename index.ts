import TelegramBot, { Message } from 'node-telegram-bot-api';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs'
import { welcome } from './commands/welcome';
import { generatePuzzle } from './commands/puzzle';
import { connectDb, solConnection, TELEGRAM_ACCESS_TOKEN } from './config';
import { addNewWallet, buyAmount, getUser, getUserCacheById, getUserPubKey, getUserSecretKey, closeAllLimitOrders, sellAmount, updateUser, verify, verifyUser } from './controllers/user';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import base58 from 'bs58'
import { convertToMilliseconds, getTokenAccountBalance, updateData, verifyDurationString } from './utils';
import { generatePriKeyConfirmCommands, generateResetConfirmCommands, generateWalletCommands } from './commands/wallet';
import { generateTwapCommands } from './commands/twap';

import { buyClick } from './messages/buy';
import { sellClick } from './messages/sell';
import { getDCABuyKeyBoard, getLimitBuyKeyBoard, getSwapBuyKeyBoard } from './keyboards/buy';
import { limitOrderClick } from './messages/limitOrders';
import { createDCAOrder, createLimitBuyOrder, runDCAOrders } from './controllers/buy';

import { dcaOrder, dcaSellOrder, limitBuyOrder, limitSellOrder } from './utils/trade';
import { DCAOrderClick } from './messages/dcsOrders';
import { getMyTokens } from './utils/token';
import { BUY_SUCCESS_MSG, ORDER_SUCCESS_MSG, SELL_SUCCESS_MSG } from './constants/msg.constants';
import { walletClick } from './messages/wallet';
import { getDCASellKeyBoard, getLimitSellKeyBoard, getSwapSellKeyBoard } from './keyboards/sell';
import { createLimitSellOrder } from './controllers/sell';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { generateSettingCommands } from './commands/setting';
import { getSettingKeyboard } from './keyboards/setting';

import { snipeClick } from './messages/snipe';
import { getSnipeKeyBoard } from './keyboards/snipe';

const token: string = TELEGRAM_ACCESS_TOKEN
const path = './user.json';
connectDb()
export const bot = new TelegramBot(token, { polling: true });

if (bot) {
  console.log("Telegram bot is running")
}

runDCAOrders()

const app = express();
const port = 7123;
const whitelist = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "*", 'https://valaichat.shicat.xyz'];

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(express.json());
app.use(cors(corsOptions));

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

app.get('/', (req: Request, res: Response) => {
  res.json("running api-valaichat.shicat.xyz");
});

bot.on('message', async (msg: Message) => {
  const chatId = msg.chat.id;
  const name = msg.chat.first_name;
  const username = msg.chat.username;
  const userId = msg.from?.id;

  if (!userId) return;
  const isVerified: boolean = await verifyUser(userId.toString(), {
    name: name,
    username: username
  })


  // await registerUser(userId.toString())
  // const users: number[] = await readJson()

  // const isVerified: boolean = await verifyUser(userId.toString(), {
  //   name: name,
  //   username: username
  // })

  if (!isVerified) {
    if (msg.text === '/verify') return;
    bot.sendMessage(chatId, "⛔ You are not authorized. You must verify by using /verify command");
    return;
  }


  // if (msg.text?.toString().toLowerCase().indexOf(hi) === 0) {
  //   try {
  //     // Get the user's profile photos
  //     const photos = await bot.getUserProfilePhotos(userId, { limit: 1 });
  //     console.log("photos", photos);

  //     if (photos.total_count > 0) {
  //       // Get the file_id of the first photo in the first set
  //       const fileId = photos.photos[0][0].file_id;
  //       bot.sendMessage(userId, `Hello ${msg.from?.first_name}`);
  //       // Send the photo to the chat
  //       await bot.sendPhoto(chatId, fileId, { caption: "Here is your profile picture!" });
  //     } else {
  //       bot.sendMessage(chatId, "No profile photos found.");
  //     }
  //   } catch (error) {
  //     console.error('Error getting or sending profile photo:', error);
  //     bot.sendMessage(chatId, "Sorry, an error occurred while fetching your profile photo.");
  //   }
  // }

  // const bye = "bye";
  // if (msg.text?.toString().toLowerCase().includes(bye)) {
  //   console.log("user data", readJson())
  //   bot.sendMessage(chatId, "Hope to see you around again, Bye");
  //   bot.sendMessage(chatId, "`inline fixed-width code`<b>bold</b> \n <i>italic</i> \n <em>italic with em</em> \n <a href=\"http://www.example.com/\">inline URL</a> \n <code>inline fixed-width code</code> \n <pre>pre-formatted fixed-width code block</pre>", { parse_mode: "HTML" });
  // }

  // const robot = "I'm robot";
  // if (msg.text?.indexOf(robot) === 0) {
  //   bot.sendMessage(chatId, "Yes I'm robot but not in that way!");
  // }

  // const location = "location";
  // if (msg.text?.indexOf(location) === 0) {
  //   bot.sendLocation(chatId, 44.97108, -104.27719);
  //   bot.sendMessage(chatId, "Here is the point");
  // }
});

// home commands
bot.onText(/\/home/, async (msg: Message) => {
  try {
    const chatId = msg.chat.id
    const pubKey: any = await getUserPubKey(chatId.toString())
    const { title, content } = await welcome(pubKey)
    if (!await verify(msg)) {
      return;
    } else {
      // console.log(msg);
      bot.sendMessage(msg.chat.id, title, {
        "reply_markup": {
          "inline_keyboard": content
        }, parse_mode: 'HTML'
      });
    }
  } catch (err) {

  }
});

// start commands
bot.onText(/\/start/, async (msg: Message) => {
  try {
    const chatId = msg.chat.id
    const pubKey: any = await getUserPubKey(chatId.toString())
    const { title, content } = await welcome(pubKey)
    if (!await verify(msg)) {
      return;
    } else {
      // console.log(msg);
      bot.sendMessage(msg.chat.id, title, {
        "reply_markup": {
          "inline_keyboard": content
        }, parse_mode: 'HTML'
      });
    }
  } catch (err) {

  }
});

// go to buy commands
bot.onText(/\/buy/, async (msg: Message) => {
  const chatId = msg.chat.id
  if (!await verify(msg)) {
    return;
  } else {
    await buyClick(bot, chatId)
  }
});

bot.onText(/\/snipe/, async (msg: Message) => {
  const chatId = msg.chat.id
  if (!await verify(msg)) {
    return;
  } else {
    await snipeClick(bot, chatId)
  }
});

// go to sell commands
bot.onText(/\/sell/, async (msg: Message) => {
  const chatId = msg.chat.id
  if (!await verify(msg)) {
    return;
  } else {
    await sellClick(bot, chatId)
  }
});

// go to wallet commands
bot.onText(/\/wallet/, async (msg: Message) => {
  try {
    const chatId = msg.chat.id
    if (!await verify(msg)) {
      return;
    } else {
      const pubKey = await getUserPubKey(chatId.toString())
      if (pubKey) {
        await walletClick(bot, pubKey, chatId) //
      }
    }
   
  } catch (err) {

  }
});

// go to setting commands
bot.onText(/\/settings/, async (msg: Message) => {
  try {
    const chatId = msg.chat.id
    if (!await verify(msg)) {
      return;
    } else {
      const { setting_title, setting_content } = await generateSettingCommands(chatId.toString())
      bot.sendMessage(chatId, setting_title, {
        "reply_markup": {
          "inline_keyboard": setting_content
        }, parse_mode: 'HTML'
      });
    }
  } catch (err) {

  }
});

// go to auto buy commands
bot.onText(/\/autobuy/, async (msg: Message) => {
  try {
    const chatId = msg.chat.id
    if (!await verify(msg)) {
      return;
    } else {
      await buyClick(bot, chatId)
    }
  } catch (err) {

  }
});


// go to active dca orders
bot.onText(/\/dcaorders/, async (msg: Message) => {
  try {
    if (!await verify(msg)) {
      return;
    } else {
      await DCAOrderClick(bot, msg.chat.id)
    }
  } catch (err) {

  }
});

// go to active limit orders
bot.onText(/\/limitorders/, async (msg: Message) => {
  try {
    if (!await verify(msg)) {
      return;
    } else {
      await limitOrderClick(bot, msg.chat.id)
    }
  } catch (err) {
  }
});

bot.onText(/\/sendpic/, (msg: Message) => {
  bot.sendPhoto(msg.chat.id, "https://via.placeholder.com/150", { caption: "Here we go! \nThis is just a caption" })
    .catch(error => {
      console.error('Error sending photo:', error);
    });
});

bot.onText(/\/verify/, async (msg: Message) => {
  const { title, content } = await generatePuzzle() //

  console.log(msg);
  bot.sendMessage(msg.chat.id, title, {
    "reply_markup": {
      "inline_keyboard": content
    }, parse_mode: 'HTML'
  });
});


// Listen for callback queries
bot.on('callback_query', async (callbackQuery) => {
  try {
    // console.log("callbackQuery", callbackQuery)
    // console.log("type: ", typeof (callbackQuery))
    const message = callbackQuery.message;

    if (!message) return;
    const data = callbackQuery.data;

    // Log the clicked button data
    console.log('Button clicked:', data);
    const userId: number | undefined = message.from?.id
    const chatId: number | undefined = message.chat?.id
    const messageId = message.message_id;
    const name = message.chat.first_name;
    const username = message.chat.username;
    if (!userId) return;

    let responseText = '';
    const pubKey = await getUserPubKey(chatId.toString())
    console.log("pubKey", pubKey)
    const secretKey: any = await getUserSecretKey(chatId.toString())
    const kp: any = Keypair.fromSecretKey(base58.decode(secretKey))
    if (data === 'Pear') {
      if (userId.toString() === "7279158263") return;
      responseText = '✅ You are verified';
      const keypair = Keypair.generate()
      updateUser(chatId.toString(), {
        isVerified: true,
        name: name,
        username: username,
        walletAddress: base58.encode(keypair.secretKey)
      })

      // let data: number[] = await readJson(path);
      // console.log("updated data", data)
      // if (!chatId) return;
      // if (!data.includes(chatId)) {
      //   data.push(chatId);

      //   writeJson(path, data)
      // }
      bot.sendMessage(chatId, responseText, { parse_mode: 'HTML' });
    }
    if (data === 'Wallet') {
      if (pubKey) {
        await walletClick(bot, pubKey, chatId)
      }

    }
    if (data === 'Deposit_SOL') {
      responseText = `To deposit send SOL to below address: 
    <code>${pubKey}</code>
    `
      bot.sendMessage(chatId, responseText, { parse_mode: 'HTML' });
    }

    if (data === 'Export_PrivateKey') {
      const { export_pri_title, export_pri_content } = await generatePriKeyConfirmCommands()
      bot.sendMessage(chatId, export_pri_title, {
        "reply_markup": {
          "inline_keyboard": export_pri_content
        }, parse_mode: 'HTML'
      });
    }
    if (data === 'Cancel') {
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
    }


    if (data === 'PrivateKey_Show_Confirm') {
      responseText = `Your <b>Private Key</b> is:

<code>${secretKey}</code>

You can now e.g. import the key into a wallet like Solflare (tap to copy)
This message should auto-delete in 1 minute. If not, delete this message once you are done.`
      bot.sendMessage(chatId, responseText, { parse_mode: 'HTML' });

      // bot.sendMessage(chatId,responseText, {
      //   "reply_markup": {
      //     "inline_keyboard": [
      //       [
      //         { text: 'Cancel', callback_data: 'Cancel' },
      //       ]
      //     ]
      //   },
      //   parse_mode: 'HTML'
      // });
    }

    if (data === 'Withdraw_SOL') {
      responseText = `Reply with the destination address`
      bot.sendMessage(chatId, responseText, { parse_mode: 'HTML' });
    }

    if (data === 'Reset_Wallet') {
      const { reset_title, reset_content } = await generateResetConfirmCommands(pubKey)
      bot.sendMessage(chatId, reset_title, {
        "reply_markup": {
          "inline_keyboard": reset_content
        }, parse_mode: 'HTML'
      });
    }
    if (data === 'Reset_Confirm') {
      await updateUser(chatId.toString(), {
        walletAddress: base58.encode(Keypair.generate().secretKey).toString()
      })
    }
    if (data === "Create_New_Wallet") {
      const res: any = await addNewWallet(chatId.toString(), base58.encode(Keypair.generate().secretKey).toString()
      )
      if (res.success) {
        bot.sendMessage(chatId, "✅ New Wallet is added", { parse_mode: 'HTML' });
        const newCommand = await generateWalletCommands(chatId.toString())
        await bot.editMessageReplyMarkup({ inline_keyboard: newCommand.content }, { chat_id: message.chat.id, message_id: message.message_id });
      }
    }
    if (data === 'TWAP') {
      const { twap_title, twap_content } = await generateTwapCommands()
      bot.sendMessage(chatId, twap_title, {
        "reply_markup": {
          "inline_keyboard": twap_content
        }, parse_mode: 'HTML'
      });
    }
    if (data === 'Limit_Orders') {
      await limitOrderClick(bot, chatId)
    }
    if (data === 'Close_All_Limit') {
      const result = await closeAllLimitOrders(chatId.toString())
      if (result) {
        bot.sendMessage(chatId, "All limit orders are closed", { parse_mode: 'HTML' });
      } else {
        bot.sendMessage(chatId, "Closing orders is failed", { parse_mode: 'HTML' });
      }
    }
    if (data === 'DCA_Orders') {
      await DCAOrderClick(bot, message.chat.id)
    }

    if (data === 'Limit_Buy') {
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCA_Buy') {
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'Swap_Buy') {
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'SwapBuy_0.001') {
      await updateData(chatId.toString(), {
        activeBuySwapSolAmount: 0.001
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'SwapBuy_1') {
      await updateData(chatId.toString(), {
        activeBuySwapSolAmount: 1
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'SwapBuy_3') {
      await updateData(chatId.toString(), {
        activeBuySwapSolAmount: 3
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'SwapBuy_5') {
      await updateData(chatId.toString(), {
        activeBuySwapSolAmount: 5
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }

    if (data === 'SwapBuy_10') {
      await updateData(chatId.toString(), {
        activeBuySwapSolAmount: 10
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
      // const txLink = await buyAmount(10, chatId.toString(), kp)
      // console.log("txLink", txLink)
      // if (txLink) {
      //   bot.sendMessage(chatId, BUY_SUCCESS_MSG, { parse_mode: 'HTML' });
      // }
    }

    if (data === 'BUY_X') {
      await buyAmount(0.005, chatId.toString(), kp)
    }

    if (data === 'Limit_Sell') {
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCA_Sell') {
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCASellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'Swap_Sell') {
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'Swap_Sell_Action') {
      const userCache = await getUserCacheById(chatId.toString())
      if (userCache.activeSellSwapPercent) {
        const txLink = await sellAmount(userCache.activeSellSwapPercent, chatId.toString(), kp)
        console.log("txLink", txLink)
        if (txLink) {
          bot.sendMessage(chatId, SELL_SUCCESS_MSG, { parse_mode: 'HTML' });
        }
      } else {
        bot.sendMessage(chatId, "Parameters are not exactly set!!!", { parse_mode: 'HTML' });
      }
    }

    if (data === 'SwapSell_5') {
      await updateData(chatId.toString(), {
        activeSellSwapPercent: 5
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'SwapSell_10') {
      await updateData(chatId.toString(), {
        activeSellSwapPercent: 10
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'SwapSell_20') {
      const res = await updateData(chatId.toString(), {
        activeSellSwapPercent: 20
      })
      if (res.success) {
        const keyboard = await getSwapSellKeyBoard(chatId.toString());
        console.log("keyboard, keyboard", keyboard)
        await bot.editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: message.chat.id, message_id: message.message_id });
      }
    }

    if (data === 'SwapSell_50') {
      const res = await updateData(chatId.toString(), {
        activeSellSwapPercent: 50
      })
      if (res.success) {
        const keyboard = await getSwapSellKeyBoard(chatId.toString());
        console.log("keyboard, keyboard", keyboard)
        await bot.editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: message.chat.id, message_id: message.message_id });
      }
    }

    if (data === 'SwapSell_100') {
      const res = await updateData(chatId.toString(), {
        activeSellSwapPercent: 100
      })
      if (res.success) {
        const keyboard = await getSwapSellKeyBoard(chatId.toString());
        console.log("keyboard, keyboard", keyboard)
        await bot.editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: message.chat.id, message_id: message.message_id });
      }
    }
    if (data === 'SwapSell_X') {
      bot.sendMessage(chatId, "Enter the sol amount for sell", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeSellSwapPercent: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }

    /******************************************************************/
    /*************************** LIMIT SELL ***************************/
    /******************************************************************/

    // limit sell interval
    if (data === 'LimitSell_Price') {
      bot.sendMessage(chatId, "Enter the trigger price of your limit sell order", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const price = msg.text

        const res = await updateData(chatId.toString(), {
          activeSellLimitPrice: Number(price)
        })
        if (res.success) {
          // bot.deleteMessage(_chatId, _messageId)
          // bot.deleteMessage(chatId, messageId)
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })

    }
    if (data === 'LimitSell_Expiry') {
      bot.sendMessage(chatId, "Enter the expiry of your limit sell order. Valid options are s (seconds), m (minutes), h (hours), and d (days). E.g. 30m or 2h.", { parse_mode: 'HTML' });
      bot.once('message', async (msg: any) => {
        const time = msg.text
        try {
          await updateData(chatId.toString(), {
            activeSellLimitDuration: verifyDurationString(time)
          })
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });

        } catch (err) {
          console.log("Err", err)
          bot.sendMessage(chatId, "Invalid time unit, use either 's', 'm', 'h', or 'd'", { parse_mode: 'HTML' });
        }

      })
    }
    // limit sell 5%
    if (data === 'LimitSell_5') {
      await updateData(chatId.toString(), {
        activeSellLimitAmount: 5
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    // limit sell 10%
    if (data === 'LimitSell_10') {
      await updateData(chatId.toString(), {
        activeSellLimitAmount: 10
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    // limit sell 20%
    if (data === 'LimitSell_20') {
      await updateData(chatId.toString(), {
        activeSellLimitAmount: 20
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    // limit sell 50%
    if (data === 'LimitSell_50') {
      await updateData(chatId.toString(), {
        activeSellLimitAmount: 50
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    // limit sell 100%
    if (data === 'LimitSell_100') {
      await updateData(chatId.toString(), {
        activeSellLimitAmount: 100
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    // limit sell x%
    if (data === 'LimitSell_X') {
      bot.sendMessage(chatId, "Enter the sol amount for buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeSellLimitAmount: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'LimitSell_Interval') {
      bot.sendMessage(chatId, "Enter the interval for limit sell", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeSellInterval: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitSellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    // create limit sell order
    if (data === "LimitSell_Create_Order") {
      const usercache = await getUserCacheById(chatId.toString())
      if (secretKey && usercache.activeSellMint && usercache.activeSellLimitPrice && usercache.activeSellLimitAmount && usercache.activeSellLimitDuration) {
        const res = await createLimitSellOrder({
          userId: chatId.toString(),
          angelSecret: secretKey,
          tokenMint: usercache.activeSellMint,
          triggerPrice: usercache.activeBuyLimitPrice,
          solAmount: usercache.activeSellLimitAmount,
          expiredAt: Date.now() + convertToMilliseconds(usercache.activeSellLimitDuration),
          type: "Sell",
          interval: usercache.activeSellInterval,
          duration: usercache.activeSellLimitDuration
        })
        if (res?.result === 'success') {
          bot.sendMessage(chatId, ORDER_SUCCESS_MSG, { parse_mode: 'HTML' });

          const tokenAta = await getAssociatedTokenAddress(
            new PublicKey(usercache.activeSellMint),
            Keypair.fromSecretKey(base58.decode(secretKey)).publicKey
          );
          const tokenBal = await solConnection.getTokenAccountBalance(tokenAta);
          if (tokenBal.value.uiAmount) {
            await limitSellOrder(
              chatId.toString(),
              secretKey,
              new PublicKey(usercache.activeSellMint),
              new PublicKey(usercache.activeSellPoolId),
              usercache.activeSellLimitPrice,
              (usercache.activeSellLimitAmount / 100) * tokenBal.value.uiAmount,
              Date.now() + convertToMilliseconds(usercache.activeSellLimitDuration),
              usercache.activeSellInterval
            )
          } else {
            bot.sendMessage(chatId, "Failed! No token balance", { parse_mode: 'HTML' });
          }

        } else {
          bot.sendMessage(chatId, "Failed! Please try again", { parse_mode: 'HTML' });
        }
      } else {
        bot.sendMessage(chatId, "Parameters are not exactly set!!!", { parse_mode: 'HTML' });
      }
    }

    /******************************************************************/
    /*************************** SWAP SELL ****************************/
    /******************************************************************/

    if (data === 'SELL_5') {
      await sellAmount(5, chatId.toString(), kp)
    }
    if (data === 'SELL_10') {
      await sellAmount(10, chatId.toString(), kp)
    }
    if (data === 'SELL_30') {
      await sellAmount(30, chatId.toString(), kp)
    }
    if (data === 'SELL_50') {
      await sellAmount(50, chatId.toString(), kp)
    }

    if (data === 'SELL_100') {
      await sellAmount(100, chatId.toString(), kp)
    }

    if (data === 'SELL_X') {
      await sellAmount(0.005, chatId.toString(), kp)
    }

    if (data === 'Buy') {
      await buyClick(bot, chatId)
    }

    if (data === 'SWAP_BUY_X') {
      bot.sendMessage(chatId, "Enter the sol amount for buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeBuySwapSolAmount: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getSwapBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'Swap_Buy_Action') {
      const userCache = await getUserCacheById(chatId.toString())
      if (userCache.activeBuySwapSolAmount) {
        const txLink = await buyAmount(userCache.activeBuySwapSolAmount, chatId.toString(), kp)
        console.log("txLink", txLink)
        if (txLink) {
          bot.sendMessage(chatId, BUY_SUCCESS_MSG, { parse_mode: 'HTML' });
        }
      } else {
        bot.sendMessage(chatId, "Parameters are not exactly set!!!", { parse_mode: 'HTML' });
      }
    }

    /******************************************************************/
    /*************************** DCA SELL ****************************/
    /******************************************************************/
    // select sell amount
    if (data?.split("_")[0] === 'DCASellAmount') {
      await updateData(chatId.toString(), {
        activeDCASellAmount: Number(data?.split("_")[1])
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCASellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    // select specific sell amount(%)
    if (data === 'DCASell_X') {
      bot.sendMessage(chatId, "Enter the percent amount for dca buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeDCASellAmount: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getDCASellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    // select num of dca sell orders
    if (data?.split("_")[0] === 'DCASellOrderNum') {
      await updateData(chatId.toString(), {
        activeDCASellOrderNum: Number(data?.split("_")[1])
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCASellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCASell_OrderNum_X') {
      bot.sendMessage(chatId, "Enter the number of orders for DCA Sell", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeDCASellOrderNum: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getDCASellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    // select dca sell duration
    if (data?.split("_")[0] === 'DCASellDuration') {
      await updateData(chatId.toString(), {
        activeDCASellDuration: Number(data?.split("_")[1]),
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCASellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }

    if (data === 'DCASell_Duration_X') {
      bot.sendMessage(chatId, "Enter the duration for DCA Sell", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeDCASellDuration: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getDCASellKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }

    // create dca sell order
    if (data === 'DCASell_Create_Order') {
      const usercache = await getUserCacheById(chatId.toString())
      if (secretKey) {
        const res = await createDCAOrder({
          userId: chatId.toString(),
          angelSecret: secretKey,
          tokenMint: usercache.activeSellMint,
          orderNum: usercache.activeDCASellOrderNum,
          solAmount: usercache.activeDCASellAmount,
          expiredAt: Date.now() + usercache.activeDCASellDuration * 3600 * 1000,
          duration: usercache.activeDCASellDuration,
          // poolId: usercache.activeSellPoolId,
          type: "Sell"
        })
        if (res?.result === 'success') {
          bot.sendMessage(chatId, ORDER_SUCCESS_MSG, { parse_mode: 'HTML' });

          const tokenAta = await getAssociatedTokenAddress(new PublicKey(usercache.activeSellMint), Keypair.fromSecretKey(base58.decode(secretKey)).publicKey)
          const tokenBal = await solConnection.getTokenAccountBalance(tokenAta)

          if (tokenBal.value.uiAmount) {
            await dcaSellOrder(
              secretKey,
              new PublicKey(usercache.activeSellMint),
              // new PublicKey(usercache.activeSellPoolId),
              // usercache.activeBuyDCAPrice,
              usercache.activeDCASellAmount / usercache.activeDCASellOrderNum / 100 * tokenBal.value.uiAmount,
              Date.now() + usercache.activeDCASellDuration * 3600 * 1000,
              usercache.activeDCASellDuration * 3600 * 1000 / usercache.activeDCASellOrderNum
            )
          }

        } else {
          bot.sendMessage(chatId, "Failed! Please try again", { parse_mode: 'HTML' });
        }
      } else {
        bot.sendMessage(chatId, "Parameters are not exactly set!!!", { parse_mode: 'HTML' });
      }

    }


    /******************************************************************/
    /*************************** Setting Dashboard ****************************/
    /******************************************************************/
    if (data === 'Setting_Dashboard') {
      const { setting_title, setting_content } = await generateSettingCommands(chatId.toString())

      bot.sendMessage(chatId, setting_title, {
        "reply_markup": {
          "inline_keyboard": setting_content
        }, parse_mode: 'HTML'
      });
    }
    if (data === 'Auto_Buy_Enable') {
      await updateData(chatId.toString(), {
        isAutoBuyEnabled: false
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSettingKeyboard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'Auto_Buy_Unable') {
      await updateData(chatId.toString(), {
        isAutoBuyEnabled: true
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getSettingKeyboard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }

    if (data === 'AutoBuy_Amount') {
      bot.sendMessage(chatId, "Enter the sol amount for auto buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          autoBuyAmount: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getSettingKeyboard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'Buy_Slippage') {
      console.log("calling Buy_Slippage...")
      bot.sendMessage(chatId, "Enter the slippage amount for buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          buySlippage: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getSettingKeyboard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'Sell_Slippage') {
      bot.sendMessage(chatId, "Enter the slippage amount for buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          sellSlippage: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getSettingKeyboard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }

    if (data === 'LimitBuy_Price') {
      bot.sendMessage(chatId, "Enter the trigger price of your limit buy order", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const price = msg.text

        const res = await updateData(chatId.toString(), {
          activeBuyLimitPrice: Number(price)
        })
        if (res.success) {
          // bot.deleteMessage(_chatId, _messageId)
          // bot.deleteMessage(chatId, messageId)
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })

    }
    if (data === 'LimitBuy_Expiry') {
      bot.sendMessage(chatId, "Enter the expiry of your limit buy order. Valid options are s (seconds), m (minutes), h (hours), and d (days). E.g. 30m or 2h.", { parse_mode: 'HTML' });
      bot.once('message', async (msg: any) => {
        const time = msg.text
        try {
          await updateData(chatId.toString(), {
            activeBuyLimitDuration: verifyDurationString(time)
          })
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });

        } catch (err) {
          console.log("Err", err)
          bot.sendMessage(chatId, "Invalid time unit, use either 's', 'm', 'h', or 'd'", { parse_mode: 'HTML' });
        }

      })
    }
    if (data === 'LimitBuy_0.001') {
      await updateData(chatId.toString(), {
        activeBuyLimitSolAmount: 0.001
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'LimitBuy_1') {
      await updateData(chatId.toString(), {
        activeBuyLimitSolAmount: 1
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'LimitBuy_3') {
      await updateData(chatId.toString(), {
        activeBuyLimitSolAmount: 3
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'LimitBuy_5') {
      await updateData(chatId.toString(), {
        activeBuyLimitSolAmount: 5
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'LimitBuy_10') {
      await updateData(chatId.toString(), {
        activeBuyLimitSolAmount: 10
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'LimitBuy_X') {
      bot.sendMessage(chatId, "Enter the sol amount for buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeBuyLimitSolAmount: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'LimitBuy_Interval') {
      bot.sendMessage(chatId, "Enter the interval for limit buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeBuyInterval: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getLimitBuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'LimitBuy_Create_Order') {
      const usercache = await getUserCacheById(chatId.toString())
      if (secretKey && usercache.activeBuyMint && usercache.activeBuyLimitPrice && usercache.activeBuyLimitSolAmount && usercache.activeBuyLimitDuration) {
        const res = await createLimitBuyOrder({
          userId: chatId.toString(),
          angelSecret: secretKey,
          tokenMint: usercache.activeBuyMint,
          triggerPrice: usercache.activeBuyLimitPrice,
          solAmount: usercache.activeBuyLimitSolAmount,
          expiredAt: Date.now() + convertToMilliseconds(usercache.activeBuyLimitDuration),
          interval: usercache.activeBuyInterval,
          duration: usercache.activeBuyLimitDuration
        })
        console.log("res", res)
        if (res?.result === 'success') {
          bot.sendMessage(chatId, ORDER_SUCCESS_MSG, { parse_mode: 'HTML' });
          await limitBuyOrder(
            chatId.toString(),
            secretKey,
            new PublicKey(usercache.activeBuyMint),
            new PublicKey(usercache.activeBuyPoolId),
            usercache.activeBuyLimitPrice,
            usercache.activeBuyLimitSolAmount,
            Date.now() + convertToMilliseconds(usercache.activeBuyLimitDuration),
            usercache.activeBuyInterval
          )
        } else {
          bot.sendMessage(chatId, "Failed! Please try again", { parse_mode: 'HTML' });
        }
      } else {
        bot.sendMessage(chatId, "Parameters are not exactly set!!!", { parse_mode: 'HTML' });
      }
    }
    if (data === 'DCABuy_Price') {
      console.log("calling llll")
      bot.sendMessage(chatId, "Enter the trigger price of your limit buy order", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const price = msg.text
        const _chatId: number = msg.chat?.id
        const _messageId = msg.message_id;

        const res = await updateData(chatId.toString(), {
          activeBuyDCAPrice: Number(price)
        })
        if (res.success) {
          // bot.deleteMessage(_chatId, _messageId)
          // bot.deleteMessage(chatId, messageId)
        }
      })

    }
    if (data === 'DCABuy_X') {
      bot.sendMessage(chatId, "Enter the sol amount for buy", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeBuyDCASolAmount: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'DCABuy_Expiry') {
      bot.sendMessage(chatId, "Enter the expiry time of your dca buy order", { parse_mode: 'HTML' });
      bot.once('message', async (msg: any) => {
        const time = msg.text
        await updateData(chatId.toString(), {
          activeBuyDCAExpired: Number(time) + Date.now()
        })
      })
    }
    if (data === 'DCABuy_0.01') {
      await updateData(chatId.toString(), {
        activeBuyDCASolAmount: 0.01
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_0.1') {
      await updateData(chatId.toString(), {
        activeBuyDCASolAmount: 0.1
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_3') {
      await updateData(chatId.toString(), {
        activeBuyDCASolAmount: 3
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_5') {
      await updateData(chatId.toString(), {
        activeBuyDCASolAmount: 5
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_10') {
      await updateData(chatId.toString(), {
        activeBuyDCASolAmount: 10
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_Order_10') {
      await updateData(chatId.toString(), {
        activeBuyDCAOrderNum: 10
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_Order_100') {
      await updateData(chatId.toString(), {
        activeBuyDCAOrderNum: 100
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_Order_500') {
      await updateData(chatId.toString(), {
        activeBuyDCAOrderNum: 500
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_Order_1000') {
      await updateData(chatId.toString(), {
        activeBuyDCAOrderNum: 1000
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_Order_X') {
      bot.sendMessage(chatId, "Enter number of orders", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeBuyDCAOrderNum: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'DCADuration_Xh') {
      bot.sendMessage(chatId, "Enter DCA duration", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          activeBuyDCADuration: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }
    if (data === 'DCADuration_0.1h') {
      await updateData(chatId.toString(), {
        activeBuyDCADuration: 0.1,
        activeBuyDCAExpired: Date.now() + 360 * 1000,
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCADuration_1h') {
      await updateData(chatId.toString(), {
        activeBuyDCADuration: 1,
        activeBuyDCAExpired: Date.now() + 3600 * 1000,
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCADuration_4h') {
      await updateData(chatId.toString(), {
        activeBuyDCADuration: 4,
        activeBuyDCAExpired: Date.now() + 3600 * 1000 * 4,
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCADuration_8h') {
      await updateData(chatId.toString(), {
        activeBuyDCADuration: 8,
        activeBuyDCAExpired: Date.now() + 3600 * 1000 * 8,
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCADuration_24h') {
      await updateData(chatId.toString(), {
        activeBuyDCADuration: 24,
        activeBuyDCAExpired: Date.now() + 3600 * 1000 * 24,
      })
      await bot.editMessageReplyMarkup({ inline_keyboard: await getDCABuyKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
    }
    if (data === 'DCABuy_Create_Order') {
      const usercache = await getUserCacheById(chatId.toString())
      if (secretKey && usercache.activeBuyMint && usercache.activeBuyDCASolAmount && usercache.activeBuyDCADuration && usercache.activeBuyDCAOrderNum) {
        const res = await createDCAOrder({
          userId: chatId.toString(),
          angelSecret: secretKey,
          tokenMint: usercache.activeBuyMint,
          orderNum: usercache.activeBuyDCAOrderNum,
          solAmount: usercache.activeBuyDCASolAmount,
          expiredAt: Date.now() + usercache.activeBuyDCADuration * 3600 * 1000,
          duration: usercache.activeBuyDCADuration,
          // poolId: usercache.activeBuyPoolId
        })
        if (res?.result === 'success') {
          bot.sendMessage(chatId, ORDER_SUCCESS_MSG, { parse_mode: 'HTML' });
          await dcaOrder(
            secretKey,
            new PublicKey(usercache.activeBuyMint),
            // new PublicKey(usercache.activeBuyPoolId),
            // usercache.activeBuyDCAPrice,
            usercache.activeBuyDCASolAmount / usercache.activeBuyDCAOrderNum,
            Date.now() + usercache.activeBuyDCADuration * 3600 * 1000,
            usercache.activeBuyDCADuration * 3600 * 1000 / usercache.activeBuyDCAOrderNum
          )
        } else {
          bot.sendMessage(chatId, "Failed! Please try again", { parse_mode: 'HTML' });
        }
      } else {
        bot.sendMessage(chatId, "Parameters are not exactly set!!!", { parse_mode: 'HTML' });
      }
    }

    if (data === 'Sell') {
      await sellClick(bot, chatId)
    }

    if (data?.includes("TgWallet_")) {
      const str_arr = data.split("_")
      const newActiveId = Number(str_arr[1])
      await updateData(chatId.toString(), {
        activeWallet: newActiveId
      })
      const newCommand = await generateWalletCommands(chatId.toString())
      await bot.editMessageReplyMarkup({ inline_keyboard: newCommand.content }, { chat_id: message.chat.id, message_id: message.message_id });
    }

    if (data === 'Wallet_Assets') {
      if (pubKey) {
        const tokens = await getMyTokens(new PublicKey(pubKey))
        let totalPrice: number = 0;
        if (tokens) {
          let txt = ``
          for (let i = 0; i < (tokens?.length > 15 ? 15 : tokens?.length); i++) {
            totalPrice += tokens[i].price * tokens[i].balance
            txt += `
          CA: <code>${tokens[i].mintAddress}</code>
          name: ${tokens[i].name}
          symbol: $${tokens[i].symbol}
          decimals: ${tokens[i].decimals}
          supply: ${tokens[i].supply}
          balance: ${tokens[i].balance}
          value: ${tokens[i].price * tokens[i].balance}
          `
          }

          console.log("txt", txt)

          bot.sendMessage(
            chatId,
            `Your Tokens:
          Total Value: ${totalPrice}
          ${txt}
          `,
            { parse_mode: 'HTML' }
          );
        }
      }
    }

    if (data === 'Import_Solana_Wallet') {
      bot.sendMessage(chatId, "Enter private key for import", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        try {
          const privKey = msg.text;
          if (!privKey) return;
          const pubKey = Keypair.fromSecretKey(base58.decode(privKey)).publicKey.toBase58();

          const res: any = await addNewWallet(chatId.toString(), privKey.toString())
          if (res.success) {
            bot.sendMessage(chatId, "✅ New Wallet is added", { parse_mode: 'HTML' });
          }
        } catch (err) {
          bot.sendMessage(chatId, "❌ Wrong!!!", { parse_mode: 'HTML' });
        }
      })
    }

    if (data === 'Snipe') {
      await snipeClick(bot, chatId)
    }

    if (data === 'Add_Snipe_CA') {
      bot.sendMessage(chatId, "Enter the token CA for snipe", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const user_cache = await getUserCacheById(chatId.toString())
        let snipeList: any[] = user_cache.snipeList ? user_cache.snipeList : []
        snipeList.push(msg.text)
        console.log("snipeList", snipeList)
        const res = await updateData(chatId.toString(), {
          snipeList: snipeList
        })
        if (res.success) {
          bot.sendMessage(chatId, "Successfully Added", { parse_mode: 'HTML' });
          // await bot.editMessageReplyMarkup({ inline_keyboard: await getSnipeKeyBoard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }

    if (data === 'Set_SnipeAmount') {
      bot.sendMessage(chatId, "Enter the sol amount for snipe", { parse_mode: 'HTML' });
      bot.once('message', async (msg: Message) => {
        const res = await updateData(chatId.toString(), {
          snipeAmount: Number(msg.text)
        })
        if (res.success) {
          await bot.editMessageReplyMarkup({ inline_keyboard: await getSettingKeyboard(chatId.toString()) }, { chat_id: message.chat.id, message_id: message.message_id });
        }
      })
    }

    else responseText = '❌ Wrong!!!';

    // Answer the callback query (to remove the loading spinner on the user's end)
    bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    console.log("err", err)
  }
});


export async function readJson(filename: string = "user.json") {
  if (!fs.existsSync(filename)) {
    // If the file does not exist, create an empty array
    fs.writeFileSync(filename, '[]', 'utf-8');
  }
  const data = fs.readFileSync(filename, 'utf-8');
  return JSON.parse(data);
}

export function writeJson(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}