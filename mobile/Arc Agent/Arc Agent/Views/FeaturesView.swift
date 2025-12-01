import SwiftUI

struct FeaturesView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Key Features")
                .font(.title2)
                .fontWeight(.bold)
            
            VStack(spacing: 12) {
                FeatureCard(
                    icon: "brain",
                    title: "AI-Powered Analysis",
                    description: "Advanced Claude 3.5 Sonnet models analyze code changes with expert-level understanding"
                )
                
                FeatureCard(
                    icon: "gearshape.2",
                    title: "Autonomous Agents",
                    description: "Multiple AI agents work together to fetch data, analyze code, and synthesize insights"
                )
                
                FeatureCard(
                    icon: "chart.bar.xaxis",
                    title: "Comprehensive Reports",
                    description: "Executive summaries, detailed metrics, and actionable recommendations"
                )
                
                FeatureCard(
                    icon: "clock",
                    title: "Real-time Progress",
                    description: "Track the analysis workflow as AI agents process your repositories"
                )
            }
        }
        .padding(.vertical, 24)
    }
}

struct FeatureCard: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(.blue)
                .frame(width: 48)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }
}

#Preview {
    FeaturesView()
        .padding()
}

