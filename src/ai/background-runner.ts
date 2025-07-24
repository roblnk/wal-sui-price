/**
 * @fileoverview This file is responsible for starting the background tasks.
 * It is imported only once in the root layout of the application.
 */
import { backgroundPriceCheckFlow } from './flows/background-flow';

// Immediately start the flow when the server starts.
// Note: In a real production environment, you would use a more robust
// solution for background tasks, but this works for demonstration.
backgroundPriceCheckFlow();
