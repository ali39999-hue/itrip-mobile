import React, { useState } from 'react';
import { View, Text, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface EsimQrCardProps {
  orderRef: string;
  smdpAddress: string;
  activationCode: string;
  dataLabel: string;
  validityDays: number;
}

export function EsimQrCard({
  orderRef: _orderRef,
  smdpAddress,
  activationCode,
  dataLabel,
  validityDays,
}: EsimQrCardProps) {
  const [copied, setCopied] = useState(false);
  const fullLpaPayload = `LPA:1$${smdpAddress}$${activationCode}`;

  const copyManualCode = async () => {
    try {
      await Share.share({ message: activationCode });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      Alert.alert('Activation Code', activationCode);
    }
  };

  return (
    <Card variant="elevated" className="p-5 border-t-4 border-t-amber-500">
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
        <View>
          <Text className="text-xs font-semibold text-sub">eSIM Tourist Pass</Text>
          <Text className="text-lg font-bold text-ink">{dataLabel} · {validityDays} Days</Text>
        </View>
        <Badge label="READY TO SCAN" variant="brand" size="sm" />
      </View>

      {/* High-Contrast QR Code */}
      <View className="items-center py-5">
        <View className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <QRCode
            value={fullLpaPayload}
            size={180}
            color="#0F172A"
            backgroundColor="#FFFFFF"
            quietZone={4}
          />
        </View>
        <Text className="text-xs text-sub mt-3 text-center">
          Scan using Phone Camera or eSIM Cellular Settings
        </Text>
      </View>

      {/* Manual Activation Code */}
      <View className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 mb-4">
        <Text className="text-[11px] text-sub mb-1">SM-DP+ Address: {smdpAddress}</Text>
        <Text className="text-xs font-mono font-bold text-ink" numberOfLines={1}>
          {activationCode}
        </Text>
      </View>

      <Button
        variant="outline"
        size="md"
        title={copied ? 'Code Copied!' : 'Copy Activation Code'}
        onPress={copyManualCode}
      />
    </Card>
  );
}
