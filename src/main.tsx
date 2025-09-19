import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import { AppProvider } from "./contexts/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ErrorBoundary>
			<HeroUIProvider>
				<BrowserRouter>
					<AppProvider>
						<App />
					</AppProvider>
				</BrowserRouter>
			</HeroUIProvider>
		</ErrorBoundary>
	</React.StrictMode>
);