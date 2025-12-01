//
//  ContentView.swift
//  Arc Agent
//
//  Created by Todd Bernson on 11/30/25.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = SprintAnalysisViewModel()
    @State private var selectedPage = 0
    
    var body: some View {
        Group {
            #if os(macOS)
            pagedInterface
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            #else
            NavigationStack {
                pagedInterface
                    .toolbar {
                        ToolbarItem(placement: .principal) {
                            if let title = tabTitle(for: selectedPage) {
                                Text(title)
                                    .font(.headline)
                            }
                        }
                    }
                    .navigationBarTitleDisplayMode(.inline)
            }
            #endif
        }
        .sheet(isPresented: $viewModel.showReportModal) {
            ReportModalView(
                markdown: viewModel.markdownReport ?? "",
                isPresented: $viewModel.showReportModal
            )
        }
    }
    
    @ViewBuilder
    private var pagedInterface: some View {
        TabView(selection: $selectedPage) {
            pageContainer {
                AgentOverviewView()
            }
            .tag(0)
            
            pageContainer {
                FeaturesView()
            }
            .tag(1)
            
            pageContainer {
                RunAgentView(viewModel: viewModel)
            }
            .tag(2)
        }
        #if os(macOS)
        .tabViewStyle(DefaultTabViewStyle())
        #else
        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .automatic))
        #endif
    }
    
    @ViewBuilder
    private func pageContainer<Content: View>(@ViewBuilder content: @escaping () -> Content) -> some View {
        GeometryReader { proxy in
            ScrollView {
                content()
                    .frame(maxWidth: min(proxy.size.width - 40, 960), alignment: .leading)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 28)
                    .padding(.horizontal, 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
    
    private func tabTitle(for index: Int) -> String? {
        switch index {
        case 0: return nil
        case 1: return "Key Features"
        case 2: return "Run the Agent"
        default: return "Sprint Intelligence"
        }
    }
}

#Preview {
    ContentView()
}
