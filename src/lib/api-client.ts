const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async signup(email: string, password: string, fullName?: string) {
    const result = await this.request<{ user: any; token: string; session: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    this.setToken(result.token);
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ user: any; token: string; session: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async logout() {
    this.setToken(null);
  }

  async getUser() {
    return this.request<{ id: string; email: string }>('/auth/user');
  }

  async getTimetables() {
    return this.request<any[]>('/timetables');
  }

  async createTimetable(data: any) {
    return this.request<any>('/timetables', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTimetable(id: string, data: any) {
    return this.request<any>(`/timetables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTimetable(id: string) {
    return this.request<any>(`/timetables/${id}`, {
      method: 'DELETE',
    });
  }

  async getSubjects() {
    return this.request<any[]>('/subjects');
  }

  async createSubject(data: any) {
    return this.request<any>('/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHomeworks() {
    return this.request<any[]>('/homeworks');
  }

  async createHomework(data: any) {
    return this.request<any>('/homeworks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHomework(id: string, data: any) {
    return this.request<any>(`/homeworks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHomework(id: string) {
    return this.request<any>(`/homeworks/${id}`, {
      method: 'DELETE',
    });
  }

  async getEvents() {
    return this.request<any[]>('/events');
  }

  async createEvent(data: any) {
    return this.request<any>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request<any>('/profiles');
  }

  async updateProfile(data: any) {
    return this.request<any>('/profiles', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getStudyPreferences() {
    return this.request<any>('/study-preferences');
  }

  async updateStudyPreferences(data: any) {
    return this.request<any>('/study-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getTopicReflections() {
    return this.request<any[]>('/topic-reflections');
  }

  async createTopicReflection(data: any) {
    return this.request<any>('/topic-reflections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStudyInsights(timetableId: string) {
    return this.request<any>(`/study-insights/${timetableId}`);
  }

  async getUserRole() {
    return this.request<any>('/user-role');
  }

  async getStudyStreaks() {
    return this.request<any[]>('/study-streaks');
  }

  async createStudyStreak(data: any) {
    return this.request<any>('/study-streaks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async analyzeDifficulty(data: { topics: any[]; focusTopics?: any[] }) {
    return this.request<any>('/analyze-difficulty', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async parseTopics(data: { text?: string; subjectName: string; images?: string[] }) {
    return this.request<any>('/parse-topics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateTimetable(data: any) {
    return this.request<any>('/generate-timetable', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async regenerateTomorrow(data: any) {
    return this.request<any>('/regenerate-tomorrow', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateInsights(data: { timetableId: string }) {
    return this.request<any>('/generate-insights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async analyzeTestScore(data: any) {
    return this.request<any>('/analyze-test-score', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adjustSchedule(data: any) {
    return this.request<any>('/adjust-schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
