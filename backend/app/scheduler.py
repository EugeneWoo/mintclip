"""
Background Scheduler for Periodic Tasks
Uses APScheduler to run cleanup jobs automatically
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.cleanup_expired_items import cleanup_expired_items
import logging

logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()


def start_scheduler():
    """
    Start the background scheduler with all scheduled jobs
    """
    # Daily cleanup at 2:00 AM UTC
    scheduler.add_job(
        cleanup_expired_items,
        trigger=CronTrigger(hour=2, minute=0),
        id='cleanup_expired_items',
        name='Clean up expired saved items',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Background scheduler started")
    logger.info("Scheduled jobs:")
    for job in scheduler.get_jobs():
        logger.info(f"  - {job.name} (next run: {job.next_run_time})")


def shutdown_scheduler():
    """
    Gracefully shutdown the scheduler
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler shutdown")
