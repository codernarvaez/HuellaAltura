import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

export const ProgressBar = ({ step, setStep }) => (
  <View style={styles.progressContainer}>
    {[1, 2, 3].map((s) => (
      <View key={s} style={styles.stepIndicatorWrapper}>
        <TouchableOpacity
          style={[styles.stepCircle, step >= s && styles.stepCircleActive]}
          onPress={() => setStep(s)}
          activeOpacity={0.7}
        >
          <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
        </TouchableOpacity>
        {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
      </View>
    ))}
  </View>
);
