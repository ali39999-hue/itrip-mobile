/* eslint-disable @typescript-eslint/no-require-imports */
import type { ImageSourcePropType } from 'react-native';

/**
 * Service & Fintech icon mappings adapted from eCardo assets.
 */
export const ServiceIcons = {
  // Travel & Mobility
  flights: require('@/../assets/icons/services/deposit_service.png') as ImageSourcePropType,
  wallets: require('@/../assets/icons/services/wallets_service.png') as ImageSourcePropType,
  exchange: require('@/../assets/icons/services/exchange_service.png') as ImageSourcePropType,
  transfer: require('@/../assets/icons/services/transfer_service.png') as ImageSourcePropType,
  virtualCard: require('@/../assets/icons/services/virtual_card_service.png') as ImageSourcePropType,
  qrCode: require('@/../assets/icons/services/qr_code_service.png') as ImageSourcePropType,
  paymentLinks: require('@/../assets/icons/services/payment_links_service.png') as ImageSourcePropType,
  p2pTrading: require('@/../assets/icons/services/p2p_trading_service.png') as ImageSourcePropType,
  makePayment: require('@/../assets/icons/services/make_payment_service.png') as ImageSourcePropType,
  billPayment: require('@/../assets/icons/services/bill_payment_service.png') as ImageSourcePropType,
  cashOut: require('@/../assets/icons/services/cash_out_service.png') as ImageSourcePropType,
  addMoney: require('@/../assets/icons/services/add_money_service.png') as ImageSourcePropType,
  giftCards: require('@/../assets/icons/services/gift_cards_service.png') as ImageSourcePropType,
  invite: require('@/../assets/icons/services/invite_service.png') as ImageSourcePropType,
  invoice: require('@/../assets/icons/services/invoice_service.png') as ImageSourcePropType,
  requestMoney: require('@/../assets/icons/services/request_money_service.png') as ImageSourcePropType,
  transaction: require('@/../assets/icons/services/transaction_service.png') as ImageSourcePropType,
  withdraw: require('@/../assets/icons/services/withdraw_service.png') as ImageSourcePropType,
} as const;

export type ServiceIconKey = keyof typeof ServiceIcons;
