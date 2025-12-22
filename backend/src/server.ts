import dotenv from 'dotenv';
import { httpServer, initDB } from './app';
import logger from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initDB();
    
    httpServer.listen(PORT, () => {
      logger.info(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

startServer();
