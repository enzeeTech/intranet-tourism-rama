<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\StaffDirectoryController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        //'laravelVersion' => Application::VERSION,
        // 'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar');
    Route::get('/calendar/events', [CalendarController::class, 'getEvents'])->name('calendar.events');
    Route::post('/calendar/event', [CalendarController::class, 'handleDateSelect'])->name('calendar.event');
    Route::put('/calendar/event/{id}', [CalendarController::class, 'updateEvent'])->name('calendar.update');
    Route::get('/profile', [ProfileController::class, 'index'])->name('profile');
    Route::get('/staffDirectory', [StaffDirectoryController::class, 'index'])->name('staffDirectory');
});

require __DIR__ . '/auth.php';
