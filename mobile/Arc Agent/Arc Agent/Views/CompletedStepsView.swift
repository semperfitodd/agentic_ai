import SwiftUI

struct CompletedStepsView: View {
    private let steps = WorkflowStepsManager.shared.steps
    
    var body: some View {
        VStack(spacing: 12) {
            Text("All Steps Completed")
                .font(.headline)
                .foregroundColor(.green)
            
            VStack(spacing: 8) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .top, spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 24, height: 24)
                            
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(step.name)
                                .font(.subheadline)
                            
                            Text(step.type.displayName)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                }
            }
            .padding()
            .background(Color.green.opacity(0.1))
            .cornerRadius(12)
        }
    }
}

#Preview {
    CompletedStepsView()
        .padding()
}

