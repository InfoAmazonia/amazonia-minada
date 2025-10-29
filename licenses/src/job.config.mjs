import later from '@breejs/later';

export const jobs = [
    {
        name: 'UpdateInvasions',
        interval: later.parse.cron('30 0 * * *'),
    },
    {
        name: 'UpdateReserveInvasions',
        interval: later.parse.cron('30 1 * * *'),
    },
    {
        name: 'TweetTotalYearInvasions',
        interval: later.parse.cron("0 12 * * 5"),
    },
    {
        name: 'TweetTotalReserveInvasions',
        interval: later.parse.cron("0 12 * * 1"),
    },
    {
        name: 'TweetTotalInvasions',
        interval: later.parse.cron("0 12 * * 3"),
    },
    {
        name: 'TweetTotalCountrySizeInvasionsPT',
        interval: later.parse.cron("0 12 * * 5"),
    },
    {
        name: 'TweetTotalCountrySizeInvasionsEN',
        interval: later.parse.cron("0 12 * * 6"),
    },
    {
        name: 'TweetNewReserveInvasionsPT',
        interval: later.parse.cron("0 9-23 15 * *"),
    },
    {
        name: 'TweetNewReserveInvasionsEN',
        interval: later.parse.cron("0 9-23 15 * *"),
    },
    {
        name: 'TweetNewInvasionsEN',
        interval: later.parse.cron("0 10-23 30 * *"),
    },
    {
        name: 'TweetNewInvasionsPT',
        interval: later.parse.cron("0 10-23 30 * *"),
    },
]