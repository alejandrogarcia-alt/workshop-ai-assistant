import axios from 'axios';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

class FigmaService {
  constructor() {
    this.token = process.env.FIGMA_ACCESS_TOKEN;
    this.teamId = process.env.FIGMA_TEAM_ID;
    this.client = axios.create({
      baseURL: FIGMA_API_BASE,
      headers: {
        'X-Figma-Token': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Create a new FigJam file
  async createFigJamFile(name) {
    try {
      const response = await this.client.post('/files', {
        name: name,
        team_id: this.teamId,
        editor_type: 'figjam'
      });
      return response.data;
    } catch (error) {
      console.error('Error creating FigJam file:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get file details
  async getFile(fileKey) {
    try {
      const response = await this.client.get(`/files/${fileKey}`);
      return response.data;
    } catch (error) {
      console.error('Error getting file:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create sticky note using Figma REST API
  async createStickyNote(fileKey, text, x, y, color = '#FFF9B1') {
    // Note: Figma REST API has limited support for creating nodes
    // We'll use the Plugin API approach via websocket or store data locally
    return {
      type: 'STICKY',
      text,
      x,
      y,
      color,
      id: `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  // Create a frame (section) for organizing content
  async createFrame(fileKey, name, x, y, width = 800, height = 600) {
    return {
      type: 'FRAME',
      name,
      x,
      y,
      width,
      height,
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  // Create text label for group headers
  async createTextLabel(fileKey, text, x, y, fontSize = 24) {
    return {
      type: 'TEXT',
      text,
      x,
      y,
      fontSize,
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  // Get project files
  async getProjectFiles() {
    try {
      const response = await this.client.get(`/teams/${this.teamId}/projects`);
      return response.data;
    } catch (error) {
      console.error('Error getting project files:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new FigmaService();
