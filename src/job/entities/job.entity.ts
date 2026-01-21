import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface JobResult {
  pdfPath?: string;
  texPath?: string;
}

@Entity('jobs')
export class Job {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: JobStatus;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column()
  templateId: string;

  @Column({ type: 'json' })
  document: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  result?: JobResult;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
