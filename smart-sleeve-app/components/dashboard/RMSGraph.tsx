import React, { useEffect, useRef, useState } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import Svg, { Path, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { useSelector } from "react-redux";
import { selectLatestFeatures } from "../../store/deviceSlice";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "../themed-text";

interface RMSGraphProps {
  channelIndex?: number; // Which muscle channel to display (default 0)
  height?: number;
  width?: number;
  lineColor?: string;
  label?: string;
}

const BUFFER_SIZE = 50; // Number of points to display (horizontal resolution)
const Y_MAX = 0.5;      // Max expected RMS value for scaling (adjust based on data)

export const RMSGraph: React.FC<RMSGraphProps> = ({
  channelIndex = 0,
  height = 150,
  width = Dimensions.get('window').width - 40,
  lineColor,
  label = "Muscle Activation"
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const strokeColor = lineColor || theme.tint;

  // Redux Selection
  const latestFeatures = useSelector(selectLatestFeatures);
  
  // Local Mutable Buffer (for performance, avoid re-rendering whole array state)
  // We initialize with 0s to have a flat line at start
  const dataRef = useRef<number[]>(new Array(BUFFER_SIZE).fill(0));
  
  // State to trigger re-render
  // Start with a valid straight path at Y=height (0 activation)
  const initialPoints = new Array(BUFFER_SIZE).fill(0).map((_, i) => `${(i * (width / (BUFFER_SIZE - 1))).toFixed(1)},${height.toFixed(1)}`);
  const initialPath = `M ${initialPoints.join(" L ")}`;
  const [pathD, setPathD] = useState<string>(initialPath);

  useEffect(() => {
    if (!latestFeatures) return;

    // 1. Get new value
    const newVal = latestFeatures.rms[channelIndex] || 0;
    
    // 2. Update Buffer (Shift left)
    dataRef.current.shift();
    dataRef.current.push(newVal);

    // 3. Construct SVG Path
    // Logic: Map index -> x, value -> y
    const stepX = width / (BUFFER_SIZE - 1);
    
    // Smooth Curve (Simple Line for now, can be Catmull-Rom if needed)
    const points = dataRef.current.map((val, index) => {
      const x = index * stepX;
      // Invert Y because SVG origin (0,0) is top-left
      // Scale value: (val / Y_MAX) * height
      const normalizedY = Math.min(val / Y_MAX, 1.0); // Clamp to 1.0
      const y = height - (normalizedY * height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const d = `M ${points.join(" L ")}`;
    if (d && d !== `M `) {     
       setPathD(d);
    }

  }, [latestFeatures, channelIndex, height, width]);

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
         <ThemedText type="defaultSemiBold">{label}</ThemedText>
      </View>
      <View style={styles.graphContainer}>
        <Svg height={height} width={width}>
            <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={strokeColor} stopOpacity="0.5" />
                    <Stop offset="1" stopColor={strokeColor} stopOpacity="0" />
                </LinearGradient>
            </Defs>
            
            {/* Grid Lines (Optional) */}
            <Line x1="0" y1={height} x2={width} y2={height} stroke={theme.icon} strokeWidth="1" opacity={0.2} />
            <Line x1="0" y1={0} x2={width} y2={0} stroke={theme.icon} strokeWidth="1" opacity={0.2} />

            {/* The Data Path */}
            <Path 
                d={pathD ? pathD : initialPath} 
                fill="none" 
                stroke={strokeColor} 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
             {/* Filled Area (Optional - nice for "Active" look) */}
            <Path 
                d={pathD ? `${pathD} L ${width},${height} L 0,${height} Z` : `${initialPath} L ${width},${height} L 0,${height} Z`} 
                fill="url(#grad)" 
                stroke="none"
            />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    // Elevation for Android
    elevation: 5,
  },
  header: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
