/**
 * Model Storage and Versioning
 * 
 * Handles saving, loading, and versioning of ML models.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModelMetadata } from './types';

export class ModelStorage {
  private modelsDir: string;

  constructor(modelsDir: string = './models') {
    this.modelsDir = modelsDir;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  /**
   * Save model to disk
   */
  saveModel(
    modelType: 'content-based' | 'collaborative' | 'hybrid',
    modelState: any,
    metadata: ModelMetadata
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${modelType}_${metadata.version}_${timestamp}.json`;
    const filepath = path.join(this.modelsDir, filename);

    const modelData = {
      metadata,
      state: modelState,
      savedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filepath, JSON.stringify(modelData, null, 2));
    
    // Update latest model reference
    const latestPath = path.join(this.modelsDir, `${modelType}_latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(modelData, null, 2));

    return filepath;
  }

  /**
   * Load latest model
   */
  loadLatestModel(modelType: 'content-based' | 'collaborative' | 'hybrid'): {
    metadata: ModelMetadata;
    state: any;
  } | null {
    const latestPath = path.join(this.modelsDir, `${modelType}_latest.json`);
    
    if (!fs.existsSync(latestPath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
    return {
      metadata: data.metadata,
      state: data.state,
    };
  }

  /**
   * Load specific model version
   */
  loadModel(
    modelType: 'content-based' | 'collaborative' | 'hybrid',
    version: string
  ): {
    metadata: ModelMetadata;
    state: any;
  } | null {
    const files = fs.readdirSync(this.modelsDir);
    const modelFile = files.find(f => 
      f.startsWith(`${modelType}_${version}_`) && f.endsWith('.json')
    );

    if (!modelFile) {
      return null;
    }

    const filepath = path.join(this.modelsDir, modelFile);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    
    return {
      metadata: data.metadata,
      state: data.state,
    };
  }

  /**
   * List all model versions
   */
  listModels(modelType?: 'content-based' | 'collaborative' | 'hybrid'): ModelMetadata[] {
    const files = fs.readdirSync(this.modelsDir);
    const models: ModelMetadata[] = [];

    files.forEach(file => {
      if (file.endsWith('.json') && !file.includes('_latest')) {
        const filepath = path.join(this.modelsDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
          if (!modelType || data.metadata.modelType === modelType) {
            models.push(data.metadata);
          }
        } catch (error) {
          console.error(`Error reading model file ${file}:`, error);
        }
      }
    });

    return models.sort((a, b) => 
      new Date(b.trainedAt).getTime() - new Date(a.trainedAt).getTime()
    );
  }

  /**
   * Delete old model versions (keep only last N)
   */
  cleanupOldModels(
    modelType: 'content-based' | 'collaborative' | 'hybrid',
    keepLastN: number = 5
  ): void {
    const models = this.listModels(modelType);
    
    if (models.length <= keepLastN) {
      return;
    }

    const toDelete = models.slice(keepLastN);
    toDelete.forEach(model => {
      const files = fs.readdirSync(this.modelsDir);
      const modelFile = files.find(f => 
        f.startsWith(`${modelType}_${model.version}_`) && f.endsWith('.json')
      );

      if (modelFile) {
        const filepath = path.join(this.modelsDir, modelFile);
        fs.unlinkSync(filepath);
        console.log(`Deleted old model: ${modelFile}`);
      }
    });
  }
}















