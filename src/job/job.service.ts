import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, JobResult } from './entities/job.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  async createJob(
    templateId: string,
    document: Record<string, any>,
    userId: string,
  ): Promise<Job> {
    const job = this.jobRepository.create({
      id: uuidv4(),
      userId,
      status: JobStatus.PENDING,
      progress: 0,
      templateId,
      document,
    });
    return this.jobRepository.save(job);
  }

  async getJob(jobId: string, userId?: string): Promise<Job | null> {
    const where: any = { id: jobId };
    if (userId) {
      where.userId = userId;
    }
    return this.jobRepository.findOne({ where });
  }

  async getJobsByUser(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ jobs: Job[]; total: number }> {
    const [jobs, total] = await this.jobRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { jobs, total };
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress?: number,
  ): Promise<void> {
    const updateData: Partial<Job> = { status };
    if (progress !== undefined) {
      updateData.progress = progress;
    }
    await this.jobRepository.update(jobId, updateData);
  }

  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    await this.jobRepository.update(jobId, { progress });
  }

  async completeJob(jobId: string, result: JobResult): Promise<void> {
    await this.jobRepository.update(jobId, {
      status: JobStatus.COMPLETED,
      progress: 100,
      result,
    });
  }

  async failJob(jobId: string, error: string): Promise<void> {
    await this.jobRepository.update(jobId, {
      status: JobStatus.FAILED,
      error,
    });
  }

  async cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAgeMs);
    await this.jobRepository.delete({
      createdAt: LessThan(cutoffDate),
    });
  }
}
