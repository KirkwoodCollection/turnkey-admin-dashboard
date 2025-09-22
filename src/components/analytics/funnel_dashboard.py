#!/usr/bin/env python3
"""
Funnel Analytics Dashboard

Real-time monitoring dashboard for the 5-stage booking funnel.
Provides insights into conversion rates, abandonment patterns, and user journeys.

Usage:
    python3 tools/monitoring/funnel_dashboard.py [--property PROPERTY_ID] [--hours HOURS]
"""

import argparse
import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

# ANSI color codes for terminal output
COLORS = {
    "GREEN": "\033[92m",
    "YELLOW": "\033[93m",
    "RED": "\033[91m",
    "BLUE": "\033[94m",
    "CYAN": "\033[96m",
    "MAGENTA": "\033[95m",
    "BOLD": "\033[1m",
    "RESET": "\033[0m",
}

# Stage configuration
STAGE_NAMES = {
    "widget_activation": "Widget Activation",
    "search_configuration": "Search & Configuration",
    "room_selection": "Room Selection",
    "rate_selection": "Rate Selection",
    "booking_completion": "Booking Completion",
}

STAGE_ORDER = [
    "widget_activation",
    "search_configuration",
    "room_selection",
    "rate_selection",
    "booking_completion",
]


def run_bigquery_query(query: str) -> List[Dict]:
    """Execute BigQuery query and return results"""
    try:
        result = subprocess.run(
            ["bq", "query", "--use_legacy_sql=false", "--format=json", "--max_rows=10000", query],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout) if result.stdout else []
    except subprocess.CalledProcessError as e:
        print(f"{COLORS['RED']}Query failed: {e.stderr}{COLORS['RESET']}")
        return []
    except Exception as e:
        print(f"{COLORS['RED']}Error running query: {e}{COLORS['RESET']}")
        return []


def get_funnel_sessions(hours: int = 24, property_id: Optional[str] = None) -> List[Dict]:
    """Get session funnel data for the specified time period"""
    start_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    
    property_filter = f"AND property_id = '{property_id}'" if property_id else ""
    
    query = f"""
    WITH session_events AS (
        SELECT
            session_id,
            user_id,
            property_id,
            event_type,
            timestamp,
            JSON_VALUE(event_data, '$.room_type') as room_selected,
            JSON_VALUE(event_data, '$.rate_plan') as rate_selected
        FROM `kirkwood-ibe.turnkey_events.events_master`
        WHERE timestamp >= '{start_time}'
        {property_filter}
    ),
    session_stages AS (
        SELECT
            session_id,
            ANY_VALUE(user_id) as user_id,
            ANY_VALUE(property_id) as property_id,
            MIN(timestamp) as session_start,
            MAX(timestamp) as session_end,
            COUNT(*) as total_events,
            
            -- Track stage entries
            LOGICAL_OR(event_type IN ('widget_initialized', 'ibe_launched', 'booking_engine_restored')) as entered_widget,
            LOGICAL_OR(event_type IN ('search_submitted', 'checkin_date_selected', 'checkout_date_selected')) as entered_search,
            LOGICAL_OR(event_type IN ('room_type_selected', 'room_details_viewed')) as entered_room_selection,
            LOGICAL_OR(event_type IN ('room_rate_selected', 'rate_details_viewed')) as entered_rate_selection,
            LOGICAL_OR(event_type IN ('payment_method_selected', 'guest_details_completed', 'reservation_confirmed')) as entered_booking,
            
            -- Track completion and abandonment
            LOGICAL_OR(event_type = 'reservation_confirmed') as is_completed,
            LOGICAL_OR(event_type = 'booking_engine_exited') as is_abandoned,
            
            -- Track navigation events
            COUNTIF(event_type = 'navigation_back') as navigation_backs,
            COUNTIF(event_type = 'booking_engine_minimized') as minimizes,
            
            -- Selections made
            ARRAY_AGG(DISTINCT room_selected IGNORE NULLS) as rooms_viewed,
            ARRAY_AGG(DISTINCT rate_selected IGNORE NULLS) as rates_viewed,
            
            -- Event journey
            ARRAY_AGG(event_type ORDER BY timestamp) as event_journey
            
        FROM session_events
        GROUP BY session_id
    )
    SELECT
        session_id,
        user_id,
        property_id,
        session_start,
        session_end,
        TIMESTAMP_DIFF(session_end, session_start, SECOND) as duration_seconds,
        total_events,
        
        -- Determine furthest stage
        CASE
            WHEN entered_booking THEN 'booking_completion'
            WHEN entered_rate_selection THEN 'rate_selection'
            WHEN entered_room_selection THEN 'room_selection'
            WHEN entered_search THEN 'search_configuration'
            WHEN entered_widget THEN 'widget_activation'
            ELSE 'unknown'
        END as furthest_stage,
        
        is_completed,
        is_abandoned,
        navigation_backs,
        minimizes,
        ARRAY_LENGTH(rooms_viewed) as unique_rooms_viewed,
        ARRAY_LENGTH(rates_viewed) as unique_rates_viewed,
        event_journey
        
    FROM session_stages
    ORDER BY session_start DESC
    """
    
    return run_bigquery_query(query)


def calculate_funnel_metrics(sessions: List[Dict]) -> Dict:
    """Calculate funnel performance metrics"""
    if not sessions:
        return {}
    
    # Initialize counters
    stage_entries = {stage: 0 for stage in STAGE_ORDER}
    stage_completions = {stage: 0 for stage in STAGE_ORDER}
    stage_abandonments = {stage: 0 for stage in STAGE_ORDER}
    stage_durations = defaultdict(list)
    navigation_by_stage = defaultdict(int)
    
    total_completed = 0
    total_abandoned = 0
    
    for session in sessions:
        furthest_stage = session.get("furthest_stage", "unknown")
        is_completed = session.get("is_completed", False)
        is_abandoned = session.get("is_abandoned", False)
        duration = session.get("duration_seconds", 0)
        nav_backs = session.get("navigation_backs", 0)
        
        if is_completed:
            total_completed += 1
        if is_abandoned:
            total_abandoned += 1
            if furthest_stage in stage_abandonments:
                stage_abandonments[furthest_stage] += 1
        
        # Count stage entries based on furthest stage reached
        if furthest_stage in STAGE_ORDER:
            stage_index = STAGE_ORDER.index(furthest_stage)
            for i in range(stage_index + 1):
                stage_entries[STAGE_ORDER[i]] += 1
                if is_completed:
                    stage_completions[STAGE_ORDER[i]] += 1
            
            stage_durations[furthest_stage].append(duration)
            
            if nav_backs > 0:
                navigation_by_stage[furthest_stage] += nav_backs
    
    # Calculate conversion rates
    conversion_rates = {}
    for i in range(len(STAGE_ORDER) - 1):
        from_stage = STAGE_ORDER[i]
        to_stage = STAGE_ORDER[i + 1]
        if stage_entries[from_stage] > 0:
            conversion_rates[f"{from_stage}_to_{to_stage}"] = (
                stage_entries[to_stage] / stage_entries[from_stage]
            )
    
    # Overall conversion rate
    overall_conversion = 0
    if stage_entries["widget_activation"] > 0:
        overall_conversion = total_completed / stage_entries["widget_activation"]
    
    # Average durations
    avg_durations = {}
    for stage, durations in stage_durations.items():
        if durations:
            avg_durations[stage] = sum(durations) / len(durations)
    
    return {
        "total_sessions": len(sessions),
        "completed_sessions": total_completed,
        "abandoned_sessions": total_abandoned,
        "overall_conversion": overall_conversion,
        "stage_entries": stage_entries,
        "stage_completions": stage_completions,
        "stage_abandonments": stage_abandonments,
        "conversion_rates": conversion_rates,
        "avg_durations": avg_durations,
        "navigation_by_stage": dict(navigation_by_stage),
    }


def display_funnel_visualization(metrics: Dict) -> None:
    """Display a visual representation of the funnel"""
    if not metrics:
        print(f"{COLORS['RED']}No data available{COLORS['RESET']}")
        return
    
    print(f"\n{COLORS['BOLD']}{'=' * 80}{COLORS['RESET']}")
    print(f"{COLORS['BOLD']}{COLORS['CYAN']}📊 BOOKING FUNNEL VISUALIZATION{COLORS['RESET']}")
    print(f"{COLORS['BOLD']}{'=' * 80}{COLORS['RESET']}\n")
    
    stage_entries = metrics["stage_entries"]
    stage_completions = metrics["stage_completions"]
    stage_abandonments = metrics["stage_abandonments"]
    conversion_rates = metrics["conversion_rates"]
    
    max_width = 60
    
    for i, stage in enumerate(STAGE_ORDER):
        stage_name = STAGE_NAMES[stage]
        entries = stage_entries[stage]
        completions = stage_completions[stage]
        abandonments = stage_abandonments[stage]
        
        # Calculate bar width
        if stage_entries["widget_activation"] > 0:
            percentage = (entries / stage_entries["widget_activation"]) * 100
            bar_width = int((entries / stage_entries["widget_activation"]) * max_width)
        else:
            percentage = 0
            bar_width = 0
        
        # Determine color based on conversion rate
        if i < len(STAGE_ORDER) - 1:
            next_stage = STAGE_ORDER[i + 1]
            conv_key = f"{stage}_to_{next_stage}"
            conv_rate = conversion_rates.get(conv_key, 0)
            
            if conv_rate >= 0.7:
                color = COLORS["GREEN"]
            elif conv_rate >= 0.4:
                color = COLORS["YELLOW"]
            else:
                color = COLORS["RED"]
        else:
            color = COLORS["BLUE"]
        
        # Display the funnel stage
        bar = "█" * bar_width
        print(f"{COLORS['BOLD']}Stage {i+1}: {stage_name:25}{COLORS['RESET']}")
        print(f"{color}{bar}{COLORS['RESET']} {percentage:.1f}%")
        print(f"  Sessions: {entries:,} | Completed: {completions:,} | Abandoned: {abandonments:,}")
        
        # Display conversion rate to next stage
        if i < len(STAGE_ORDER) - 1:
            next_stage = STAGE_ORDER[i + 1]
            conv_key = f"{stage}_to_{next_stage}"
            conv_rate = conversion_rates.get(conv_key, 0)
            print(f"  {COLORS['CYAN']}➜ Conversion to next: {conv_rate:.1%}{COLORS['RESET']}")
        
        print()


def display_key_metrics(metrics: Dict) -> None:
    """Display key performance metrics"""
    print(f"\n{COLORS['BOLD']}📈 KEY METRICS{COLORS['RESET']}")
    print("-" * 40)
    
    total = metrics["total_sessions"]
    completed = metrics["completed_sessions"]
    abandoned = metrics["abandoned_sessions"]
    overall_conv = metrics["overall_conversion"]
    
    # Overall metrics
    print(f"Total Sessions: {total:,}")
    print(f"Completed Bookings: {completed:,}")
    print(f"Abandoned Sessions: {abandoned:,}")
    print(f"{COLORS['BOLD']}Overall Conversion Rate: {overall_conv:.2%}{COLORS['RESET']}")
    
    # Average session duration by stage
    if metrics.get("avg_durations"):
        print(f"\n{COLORS['BOLD']}⏱️  Average Session Duration by Furthest Stage:{COLORS['RESET']}")
        for stage in STAGE_ORDER:
            if stage in metrics["avg_durations"]:
                duration = metrics["avg_durations"][stage]
                minutes = int(duration // 60)
                seconds = int(duration % 60)
                print(f"  {STAGE_NAMES[stage]:25}: {minutes}m {seconds}s")


def display_abandonment_analysis(sessions: List[Dict]) -> None:
    """Analyze and display abandonment patterns"""
    print(f"\n{COLORS['BOLD']}🚪 ABANDONMENT ANALYSIS{COLORS['RESET']}")
    print("-" * 40)
    
    abandonment_reasons = defaultdict(int)
    abandonment_stages = defaultdict(int)
    
    for session in sessions:
        if session.get("is_abandoned"):
            stage = session.get("furthest_stage", "unknown")
            abandonment_stages[stage] += 1
            
            # Analyze reason based on behavior
            nav_backs = session.get("navigation_backs", 0)
            duration = session.get("duration_seconds", 0)
            events = session.get("total_events", 0)
            
            if nav_backs > 3:
                abandonment_reasons["Excessive Navigation"] += 1
            elif duration < 30:
                abandonment_reasons["Quick Bounce"] += 1
            elif events < 5:
                abandonment_reasons["Low Engagement"] += 1
            else:
                abandonment_reasons["Other/Timeout"] += 1
    
    # Display abandonment by stage
    print(f"{COLORS['YELLOW']}Abandonments by Stage:{COLORS['RESET']}")
    for stage in STAGE_ORDER:
        if stage in abandonment_stages:
            count = abandonment_stages[stage]
            print(f"  {STAGE_NAMES[stage]:25}: {count:,}")
    
    # Display abandonment reasons
    print(f"\n{COLORS['YELLOW']}Abandonment Reasons:{COLORS['RESET']}")
    for reason, count in sorted(abandonment_reasons.items(), key=lambda x: x[1], reverse=True):
        print(f"  {reason:25}: {count:,}")


def display_property_comparison(sessions: List[Dict]) -> None:
    """Compare funnel performance across properties"""
    property_metrics = defaultdict(lambda: {
        "sessions": 0,
        "completions": 0,
        "abandonments": 0,
        "stages": defaultdict(int)
    })
    
    for session in sessions:
        prop = session.get("property_id", "Unknown")
        property_metrics[prop]["sessions"] += 1
        
        if session.get("is_completed"):
            property_metrics[prop]["completions"] += 1
        if session.get("is_abandoned"):
            property_metrics[prop]["abandonments"] += 1
        
        stage = session.get("furthest_stage", "unknown")
        if stage in STAGE_ORDER:
            property_metrics[prop]["stages"][stage] += 1
    
    if len(property_metrics) > 1:
        print(f"\n{COLORS['BOLD']}🏨 PROPERTY COMPARISON{COLORS['RESET']}")
        print("-" * 40)
        
        for prop, metrics in sorted(property_metrics.items(), key=lambda x: x[1]["sessions"], reverse=True)[:10]:
            sessions = metrics["sessions"]
            completions = metrics["completions"]
            conv_rate = completions / sessions if sessions > 0 else 0
            
            # Determine color based on conversion rate
            if conv_rate >= 0.05:
                color = COLORS["GREEN"]
            elif conv_rate >= 0.02:
                color = COLORS["YELLOW"]
            else:
                color = COLORS["RED"]
            
            print(f"\n{COLORS['BOLD']}{prop}{COLORS['RESET']}")
            print(f"  Sessions: {sessions:,} | Bookings: {completions:,}")
            print(f"  {color}Conversion Rate: {conv_rate:.2%}{COLORS['RESET']}")


def main():
    """Main dashboard function"""
    parser = argparse.ArgumentParser(description="Funnel Analytics Dashboard")
    parser.add_argument(
        "--property",
        help="Filter by property ID",
        default=None
    )
    parser.add_argument(
        "--hours",
        type=int,
        help="Number of hours to analyze (default: 24)",
        default=24
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Auto-refresh dashboard every 30 seconds"
    )
    
    args = parser.parse_args()
    
    try:
        while True:
            # Clear screen for refresh
            if args.refresh:
                print("\033[2J\033[H")  # Clear screen and move cursor to top
            
            # Header
            print(f"{COLORS['BOLD']}{COLORS['MAGENTA']}")
            print("╔══════════════════════════════════════════════════════════════╗")
            print("║          TURNKEYHMS 5-STAGE FUNNEL DASHBOARD                ║")
            print("╚══════════════════════════════════════════════════════════════╝")
            print(f"{COLORS['RESET']}")
            
            # Time range
            print(f"📅 Time Range: Last {args.hours} hours")
            if args.property:
                print(f"🏨 Property: {args.property}")
            print(f"🕐 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Get session data
            print(f"\n{COLORS['CYAN']}Loading session data...{COLORS['RESET']}")
            sessions = get_funnel_sessions(args.hours, args.property)
            
            if not sessions:
                print(f"{COLORS['RED']}No sessions found for the specified criteria{COLORS['RESET']}")
            else:
                print(f"Found {len(sessions):,} sessions")
                
                # Calculate metrics
                metrics = calculate_funnel_metrics(sessions)
                
                # Display visualizations
                display_funnel_visualization(metrics)
                display_key_metrics(metrics)
                display_abandonment_analysis(sessions)
                
                if not args.property:
                    display_property_comparison(sessions)
            
            if args.refresh:
                print(f"\n{COLORS['CYAN']}Refreshing in 30 seconds... (Ctrl+C to exit){COLORS['RESET']}")
                import time
                time.sleep(30)
            else:
                break
    
    except KeyboardInterrupt:
        print(f"\n{COLORS['YELLOW']}Dashboard stopped by user{COLORS['RESET']}")
        sys.exit(0)
    except Exception as e:
        print(f"{COLORS['RED']}Error: {e}{COLORS['RESET']}")
        sys.exit(1)


if __name__ == "__main__":
    main()