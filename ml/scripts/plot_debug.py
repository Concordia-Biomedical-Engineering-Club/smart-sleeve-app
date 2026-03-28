import pandas as pd
import matplotlib.pyplot as plt
import os

def plot_samples():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, 'data', 'train.csv')
    
    if not os.path.exists(data_path):
        print(f"File not found: {data_path}")
        return
        
    df = pd.read_csv(data_path)
    
    # Plot first 1000 samples
    samples_to_plot = 2000
    subset = df.head(samples_to_plot)
    
    plt.figure(figsize=(15, 10))
    
    # Plot Channel 1
    plt.subplot(2, 1, 1)
    plt.plot(subset['Ch1'], label='Channel 1')
    plt.title('EMG Signal (Channel 1)')
    plt.ylabel('Amplitude')
    plt.legend()
    
    # Plot Label
    plt.subplot(2, 1, 2)
    plt.plot(subset['Label'], label='Label (1=Active, 0=Rest)', color='orange')
    plt.title('Activity Label')
    plt.xlabel('Sample Index')
    plt.ylabel('Label')
    plt.legend()
    
    plt.tight_layout()
    output_path = os.path.join(base_dir, 'data', 'signal_debug.png')
    plt.savefig(output_path)
    print(f"Debug plot saved to {output_path}")

if __name__ == "__main__":
    plot_samples()
