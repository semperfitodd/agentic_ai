import SwiftUI

struct ProgressTrackerView: View {
    let progress: Double
    let currentStep: Int
    let completedSteps: Set<Int>
    
    private let steps = WorkflowStepsManager.shared.steps
    
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                if currentStep < steps.count {
                    Text(steps[currentStep].type.displayName)
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(steps[currentStep].type == .ai ? Color.purple.opacity(0.2) : Color.blue.opacity(0.2))
                        .foregroundColor(steps[currentStep].type == .ai ? .purple : .blue)
                        .cornerRadius(8)
                }
                
                Spacer()
                
                Text("\(Int(progress))%")
                    .font(.headline)
                    .foregroundColor(.primary)
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.secondary.opacity(0.2))
                        .frame(height: 12)
                    
                    RoundedRectangle(cornerRadius: 8)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [.blue, .purple]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * (progress / 100.0), height: 12)
                        .shadow(color: .blue.opacity(0.5), radius: 8, x: 0, y: 0)
                }
            }
            .frame(height: 12)
            
            VStack(spacing: 12) {
                ForEach(displayedStepIndices, id: \.self) { index in
                    let step = steps[index]
                    StepItemView(
                        step: step,
                        index: index,
                        isCompleted: completedSteps.contains(index),
                        isCurrent: currentStep == index
                    )
                }
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(16)
    }
    
    private var displayedStepIndices: [Int] {
        var order: [Int] = []
        if currentStep < steps.count {
            order.append(currentStep)
        }
        let completedOrder = completedSteps.sorted(by: >)
        for index in completedOrder where index != currentStep {
            order.append(index)
        }
        if order.isEmpty {
            return completedOrder
        }
        return order
    }
}

struct StepItemView: View {
    let step: WorkflowStep
    let index: Int
    let isCompleted: Bool
    let isCurrent: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(indicatorColor)
                    .frame(width: 32, height: 32)
                
                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                } else if isCurrent {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.7)
                } else {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 8, height: 8)
                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(step.name)
                    .font(.subheadline)
                    .fontWeight(isCurrent ? .semibold : .regular)
                    .foregroundColor(isCompleted || isCurrent ? .primary : .secondary)
                
                Text(step.type.displayName)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(step.type == .ai ? Color.purple.opacity(0.15) : Color.blue.opacity(0.15))
                    .foregroundColor(step.type == .ai ? .purple : .blue)
                    .cornerRadius(6)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
    
    private var indicatorColor: Color {
        if isCompleted {
            return .green
        } else if isCurrent {
            return .blue
        } else {
            return Color.secondary.opacity(0.3)
        }
    }
}

#Preview {
    ProgressTrackerView(
        progress: 45,
        currentStep: 5,
        completedSteps: Set(0..<5)
    )
    .padding()
}

