import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography, Shadows } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";

const screenWidth = Dimensions.get("window").width;

interface TrendChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      color: (opacity?: number) => string;
      strokeWidth?: number;
    }[];
    legend: string[];
  };
  title: string;
  subtitle: string;
}

export function TrendChart({ data, title, subtitle }: TrendChartProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const chartConfig = {
    backgroundColor: theme.cardBackground,
    backgroundGradientFrom: theme.cardBackground,
    backgroundGradientTo: theme.cardBackground,
    color: (opacity = 1) => theme.textSecondary,
    labelColor: (opacity = 1) => theme.textSecondary,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: theme.background,
    },
    propsForBackgroundLines: {
      strokeDasharray: "5, 5",
      strokeOpacity: 0.1,
      stroke: theme.textSecondary,
    },
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }, Shadows.card]}>
      <ThemedText style={[Typography.heading3, styles.cardTitle]}>{title}</ThemedText>
      <ThemedText style={[Typography.caption, styles.cardSubtitle]}>{subtitle}</ThemedText>

      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: data.labels,
            datasets: data.datasets,
          }}
          width={screenWidth - 80}
          height={260}
          chartConfig={chartConfig}
          style={styles.chart}
          bezier
          segments={6}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
          yAxisLabel=""
          yAxisSuffix="°"
          formatXLabel={(label) => {
            const map: { [key: string]: string } = {
              Sunday: "Sunday",
              Tuesday: "Tuesday",
              Thursday: "Thursday",
              Saturday: "Saturday",
            };
            // Match Figma labels
            return map[label] || "";
          }}
        />
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        {data.legend.map((item, index) => (
          <View key={item} style={styles.legendItem}>
            <View
              style={[
                styles.legendIndicator,
                { backgroundColor: data.datasets[index].color() },
              ]}
            />
            <ThemedText style={Typography.label}>{item}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
  },
  cardTitle: {
    color: "#1A1A1A",
  },
  cardSubtitle: {
    color: "#000000",
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E7F3FF",
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  legendIndicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
});
