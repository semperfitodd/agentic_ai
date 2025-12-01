import SwiftUI

struct FetchingReportView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Retrieving your sprint report...")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(16)
        .padding(.horizontal)
    }
}

#Preview {
    FetchingReportView()
}

