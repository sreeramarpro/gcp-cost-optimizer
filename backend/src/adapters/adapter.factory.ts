import fs from 'fs';
import { CloudResourceAdapter } from './base.adapter';
import { ComputeEngineAdapter } from './compute.adapter';
import { MockComputeEngineAdapter } from './mock.adapter';
import { config } from '../config';

export interface AdapterStatus {
  mode: 'LIVE_GCP' | 'SANDBOX_DEMO';
  resourceType: string;
  projectId: string;
  credentialsConfigured: boolean;
  statusMessage: string;
}

class AdapterManager {
  private currentAdapter: CloudResourceAdapter;
  private currentMode: 'LIVE_GCP' | 'SANDBOX_DEMO';
  private activeProjectId: string;

  constructor() {
    this.activeProjectId = config.gcpProjectId || 'demo-sandbox-project';

    const hasCreds = Boolean(
      config.googleApplicationCredentials &&
      fs.existsSync(config.googleApplicationCredentials)
    );

    if (config.gcpProjectId && hasCreds) {
      this.currentMode = 'LIVE_GCP';
      this.currentAdapter = new ComputeEngineAdapter({
        projectId: config.gcpProjectId,
        keyFilename: config.googleApplicationCredentials,
      });
    } else {
      this.currentMode = 'SANDBOX_DEMO';
      this.currentAdapter = new MockComputeEngineAdapter();
    }
  }

  getAdapter(): CloudResourceAdapter {
    return this.currentAdapter;
  }

  getMode(): 'LIVE_GCP' | 'SANDBOX_DEMO' {
    return this.currentMode;
  }

  getStatus(): AdapterStatus {
    const credsExist = Boolean(
      config.googleApplicationCredentials &&
      fs.existsSync(config.googleApplicationCredentials)
    );

    return {
      mode: this.currentMode,
      resourceType: this.currentAdapter.resourceType,
      projectId: this.activeProjectId,
      credentialsConfigured: credsExist,
      statusMessage:
        this.currentMode === 'LIVE_GCP'
          ? `Connected to live Google Cloud project "${this.activeProjectId}" via Compute Engine API.`
          : 'Running in Sandbox Demonstration Mode with simulated GCP resources. To connect to live GCP, configure credentials in Settings or .env.',
    };
  }

  setLiveGCP(projectId: string, keyFilePath?: string) {
    if (keyFilePath && !fs.existsSync(keyFilePath)) {
      throw new Error(`Credential file not found at path: ${keyFilePath}`);
    }

    this.activeProjectId = projectId;
    this.currentAdapter = new ComputeEngineAdapter({
      projectId,
      keyFilename: keyFilePath,
    });
    this.currentMode = 'LIVE_GCP';
  }

  setSandboxDemo() {
    this.currentAdapter = new MockComputeEngineAdapter();
    this.currentMode = 'SANDBOX_DEMO';
    this.activeProjectId = 'demo-sandbox-project';
  }
}

export const adapterManager = new AdapterManager();
