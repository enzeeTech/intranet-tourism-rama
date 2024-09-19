import React, { useEffect, useRef, useState } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import axios from "axios";
import * as bootstrap from "bootstrap";
import { format } from "date-fns";

import { useCsrf } from "@/composables";
import Example from "@/Layouts/DashboardLayoutNew";

import pencilIcon from "../../../public/assets/EditIcon.svg";
import printIcon from "../../../public/assets/PrintPDF.svg";
import searchIcon from "../../../public/assets/search.png";
import PrintCalendar from "./Calendar/PrintCalendar";

import "./Calendar/index.css";
// import { CakeIcon } from '@heroicons/react/20/solid';

function Calendar() {
    const [events, setEvents] = useState([]);
    const [showAllEvents, setShowAllEvents] = useState(false);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [eventData, setEventData] = useState({
        title: "",
        venue: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        description: "",
        color: "purple",
        url: "",
    });
    const [includeUrl, setIncludeUrl] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const csrfToken = useCsrf();
    const [showPrint, setShowPrint] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printRange, setPrintRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [isUrlFieldVisible, setIsUrlFieldVisible] = useState(false);
    const [eventId, setEventId] = useState(null);
    const calendarRef = useRef(null);

    const toggleShowAllEvents = () => {
        setShowAllEvents(!showAllEvents);
    };
    useEffect(() => {
        fetchEvents();
        fetchBirthdayEvents(); // Fetch and add birthday events
    }, []);

    useEffect(() => {
        filterEvents();
    }, [searchTerm, events]);

    // const fetchEvents = () => {
    //     fetch('/api/events/events?with[]=author')
    //         .then(response => response.json())
    //         .then(data => {
    //             console.log("DATAAA", data);

    //             const formattedEvents = data.data.data.map(event => ({
    //                 id: event.id,
    //                 title: event.title,
    //                 start: event.start_at,
    //                 end: event.end_at,
    //                 description: event.description,
    //                 venue: event.venue,
    //                 color: event.color,
    //                 userName: event.author.name,
    //                 url: event.url,
    //             }));
    //             setEvents(prevEvents => [...prevEvents, ...formattedEvents]);
    //             setFilteredEvents(prevEvents => [...prevEvents, ...formattedEvents]);
    //             if (calendarRef.current) {
    //                 calendarRef.current.getApi().gotoDate(new Date());
    //             }
    //         })
    //         .catch(error => {
    //             console.error('Error fetching events: ', error);
    //         });
    // };

    const fetchEvents = async () => {
        try {
            let allEvents = [];
            let currentPage = 1;
            let totalPages = 1;

            while (currentPage <= totalPages) {
                const response = await fetch(
                    `/api/events/events?with[]=author&page=${currentPage}`
                );
                const data = await response.json();

                if (data && data.data && Array.isArray(data.data.data)) {
                    const formattedEvents = data.data.data.map((event) => ({
                        id: event.id,
                        title: event.title,
                        start: event.start_at,
                        end: event.end_at,
                        description: event.description,
                        venue: event.venue,
                        color: event.color,
                        userName: event.author.name,
                        url: event.url,
                    }));

                    allEvents = [...allEvents, ...formattedEvents];

                    totalPages = data.data.last_page;
                    currentPage++;
                } else {
                    console.error("Error: Expected an array, but got:", data);
                    break;
                }
            }

            console.log("All Events:", allEvents);

            // Set events in state
            setEvents((prevEvents) => [...prevEvents, ...allEvents]);
            setFilteredEvents((prevEvents) => [...prevEvents, ...allEvents]);

            if (calendarRef.current) {
                calendarRef.current.getApi().gotoDate(new Date());
            }
        } catch (error) {
            console.error("Error fetching events: ", error);
        }
    };

    const fetchBirthdayEvents = async () => {
        try {
            let allProfiles = [];
            let currentPage = 1;
            let totalPages = 1;

            while (currentPage <= totalPages) {
                // const response = await fetch(`/api/profile/profiles?page=${currentPage}`);
                const response = await fetch(
                    `/api/profile/profiles?filter[]=dob&paginate=false`
                );
                const data = await response.json();

                if (data && data.data && Array.isArray(data.data.data)) {
                    allProfiles = [...allProfiles, ...data.data.data];

                    totalPages = data.data.last_page;
                    currentPage++;
                } else {
                    console.error("Error: Expected an array, but got:", data);
                    break;
                }
            }
            console.log("DATAAAA", allProfiles);

            // Map profiles to birthday events
            const birthdayEvents = allProfiles.reduce((acc, profile) => {
                if (!profile.dob) return acc; // Skip profiles with no dob

                const dob = new Date(profile.dob);
                if (isNaN(dob.getTime())) return acc; // Skip invalid dob

                const currentYear = new Date().getFullYear();
                dob.setFullYear(currentYear);

                // const dateStr = dob.toISOString().split('T')[0];
                const year = dob.getFullYear();
                const month = String(dob.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
                const day = String(dob.getDate()).padStart(2, "0");
                const dateStr = `${year}-${month}-${day}`;

                // console.log("dateStr", dateStr);
                // console.log("dob", dob);

                let existingEvent = acc.find(
                    (event) => event.start === dateStr
                );

                if (existingEvent) {
                    // Ensure names property exists and push the new name
                    if (!existingEvent.extendedProps.names) {
                        existingEvent.extendedProps.names = [];
                    }
                    existingEvent.extendedProps.names.push(profile.bio);
                } else {
                    // Create a new birthday event with names initialized
                    acc.push({
                        title: `Birthday: ${profile.bio}`,
                        start: dateStr,
                        allDay: true,
                        backgroundColor: "transparent",
                        textColor: "blue",
                        isBirthday: true,
                        extendedProps: {
                            names: [profile.bio], // Initialize names array
                        },
                    });
                }
                return acc;
            }, []);

            setEvents((prevEvents) => [...prevEvents, ...birthdayEvents]);
            setFilteredEvents((prevEvents) => [
                ...prevEvents,
                ...birthdayEvents,
            ]);
        } catch (error) {
            console.error("Error fetching birthdays: ", error);
        }
    };

    const filterEvents = () => {
        if (searchTerm.trim() === "") {
            setFilteredEvents(events);
            if (calendarRef.current) {
                calendarRef.current.getApi().gotoDate(new Date());
            }
        } else {
            const filtered = events.filter(
                (event) =>
                    event.title
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    event.start
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    event.end
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    (event.start &&
                        format(new Date(event.start), "yyyy MM dd")
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())) ||
                    (event.end &&
                        format(new Date(event.end), "yyyy MM dd")
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()))
            );
            setFilteredEvents(filtered);

            if (filtered.length > 0 && calendarRef.current) {
                const firstEventDate = new Date(filtered[0].start);
                calendarRef.current.getApi().gotoDate(firstEventDate);
            }
        }
    };

    const handleDateSelect = (info) => {
        const selectedDate = new Date(info.startStr);
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };
        setIsModalOpen(true);
        setEventData({
            title: "",
            venue: "",
            startDate: formatDate(selectedDate),
            endDate:
                selectedDate < new Date()
                    ? format(new Date(), "yyyy-MM-dd")
                    : formatDate(selectedDate),
            startTime: "",
            endTime: "",
            color: "purple",
            url: "",
        });
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEventData({
            title: "",
            venue: "",
            startDate: "",
            endDate: "",
            startTime: "",
            endTime: "",
            color: "purple",
            url: "",
        });
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEventData({
            title: "",
            venue: "",
            startDate: "",
            endDate: "",
            startTime: "",
            endTime: "",
            color: "purple",
            url: "",
        });
    };

    const closePrintModal = () => {
        setIsPrintModalOpen(false);
        setPrintRange({ startDate: "", endDate: "" });
    };

    const handleChange = (e) => {
        setEventData({ ...eventData, [e.target.name]: e.target.value });
    };

    const handlePrintRangeChange = (e) => {
        setPrintRange({ ...printRange, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formatDateTime = (date, time) => `${date}T${time}`;

        // Hardcoded start and end times
        const defaultStartTime = "09:00";
        const defaultEndTime = "17:00";

        const eventPayload = {
            title: eventData.title,
            start_at: formatDateTime(eventData.startDate, defaultStartTime),
            end_at: formatDateTime(eventData.endDate, defaultEndTime),
            description: eventData.description,
            color: eventData.color,
            // url: includeUrl ? eventData.url : null,
            // Only include venue if it's provided
            ...(eventData.venue ? { venue: eventData.venue } : {}),
        };

        try {
            const response = await axios.post(
                "/api/events/events",
                eventPayload
            );
            const { data } = response.data;
            if ([401, 403, 500].includes(response.status)) {
                console.error("Error creating event: ", data.errors);

                throw new Error("Error creating event");
            }
            setEvents([...events, data]);
            closeModal();
            window.location.reload();
        } catch (error) {
            console.error("Error creating event: ", error);
            setIsModalOpen(false);
            // fetchEvents();
        }
    };

    const handlePrint = () => {
        setIsPrintModalOpen(true);
    };

    const handlePrintSubmit = () => {
        const filteredEvents = events.filter((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const rangeStart = new Date(printRange.startDate);
            const rangeEnd = new Date(printRange.endDate);

            return eventStart >= rangeStart && eventEnd <= rangeEnd;
        });
        setFilteredEvents(filteredEvents);
        setShowPrint(true);
        setTimeout(() => {
            window.print();
            setShowPrint(false);
        }, 1000);
        closePrintModal();
    };

    // const handleEventClick = (eventInfo) => {
    //     eventInfo.jsEvent.preventDefault();
    //     // Trigger handleEditClick with the event data
    //     handleEditClick(eventInfo.event);
    // };

    const handleEventClick = (eventInfo) => {
        eventInfo.jsEvent.preventDefault();

        // Check if the event is a birthday event
        if (eventInfo.event.extendedProps.isBirthday) {
            // If it's a birthday event, do nothing (or you could add custom behavior here)
            return;
        }

        // Trigger handleEditClick with the event data for non-birthday events
        handleEditClick(eventInfo.event);
    };

    const handleEditClick = (event) => {
        const formatTime = (date) => {
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${hours}:${minutes}`;
        };

        const url = event.url !== "null" ? event.url : ""; // Handle 'null' or undefined

        setEventId(event.id); // Set the event ID
        setEventData({
            title: event.title,
            venue: event.extendedProps.venue,
            startDate: event.start.toISOString().split("T")[0],
            endDate: event.end ? event.end.toISOString().split("T")[0] : "",
            startTime: formatTime(event.start),
            endTime: event.end ? formatTime(event.end) : "",
            description: event.extendedProps.description,
            color: event.backgroundColor,
            url: url,
        });

        setIncludeUrl(url !== ""); // Only set to true if URL is not an empty string
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        try {
            const FfData = new FormData();
            FfData.append("_method", "PUT");
            FfData.append("title", eventData.title);
            FfData.append("venue", eventData.venue);
            FfData.append(
                "start_at",
                `${eventData.startDate}T${eventData.startTime}`
            );
            FfData.append(
                "end_at",
                `${eventData.endDate}T${eventData.endTime}`
            );
            FfData.append("description", eventData.description);
            FfData.append("color", eventData.color);
            // FfData.append('url', eventData.url || '');

            const response = await fetch(`/api/events/events/${eventId}`, {
                method: "POST",
                body: FfData,
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": csrfToken || "",
                },
            });

            const updatedEvent = response.data;

            setEvents((prevEvents) =>
                prevEvents.map((event) =>
                    event.id === eventId ? updatedEvent : event
                )
            );
            setIsEditModalOpen(false);
            fetchEvents();
            window.location.reload();
            // } else {
            //     const errorData = await response.json();
            //     console.error('Error updating event:', errorData);
            // }
        } catch (error) {
            console.error("Error updating event:", error);
            setIsEditModalOpen(false);
            // fetchEvents()
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/events/events/${eventId}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": csrfToken || "",
                },
            });

            if (response.ok) {
                setEvents((prevEvents) =>
                    prevEvents.filter((event) => event.id !== eventId)
                );
                setIsEditModalOpen(false);
                window.location.reload();
            } else {
                const errorData = await response.json();
                console.error("Error deleting event:", errorData);
            }
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    return (
        <Example>
            <div
                className="container mx-auto mt-4 "
                style={{ maxWidth: "90%" }}
            >
                <h1 className="mb-3 font-sans text-4xl font-bold text-left">
                    Calendar
                </h1>
                <hr
                    className="mx-auto my-2"
                    style={{ borderColor: "#E4E4E4", borderWidth: "1px" }}
                />
                <div className="flex flex-col items-center w-full mt-3 mb-8">
                    <div className="flex items-center justify-between w-full">
                        <input
                            type="search"
                            className="flex-grow px-6 py-3 mt-2 bg-gray-100 border-gray-100 rounded-full input-no-outline"
                            placeholder="Search for events"
                            aria-label="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            onClick={handlePrint}
                            className="flex items-center justify-center px-3 py-3 mx-3 mt-2 bg-red-500 rounded-full hover:bg-red-700"
                        >
                            <img
                                src={printIcon}
                                alt="Print"
                                className="w-6 h-6"
                            />
                        </button>
                        <button
                            onClick={() => {
                                setEventData({
                                    title: "",
                                    venue: "",
                                    startDate: format(new Date(), "yyyy-MM-dd"),
                                    endDate: format(new Date(), "yyyy-MM-dd"),
                                    startTime: "",
                                    endTime: "",
                                    description: "",
                                    color: "purple",
                                });

                                setIsModalOpen(true);
                            }}
                            className="flex items-center text-white bg-blue-500 hover:bg-blue-700 mt-2 px-3.5 py-3.5 rounded-full"
                        >
                            <img
                                src="/assets/plus.svg"
                                alt="Plus icon"
                                className="w-5 h-5"
                            />
                        </button>
                    </div>
                </div>

                <FullCalendar
                    plugins={[
                        dayGridPlugin,
                        timeGridPlugin,
                        interactionPlugin,
                        listPlugin,
                    ]}
                    initialView="dayGridMonth"
                    selectable={true}
                    selectHelper={true}
                    ref={calendarRef}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    height={650}
                    buttonText={{
                        today: "Today",
                        year: "Year",
                        month: "Month",
                        day: "Day",
                    }}
                    events={filteredEvents}
                    eventDidMount={(info) => {
                        console.log(
                            "eventDidMount called for event:",
                            info.event
                        );

                        if (info.event.extendedProps.isBirthday) {
                            console.log(
                                "Birthday event detected:",
                                info.event.extendedProps.names
                            );

                            info.el.style.backgroundColor = "transparent";
                            info.el.style.border = "none";
                            info.el.style.color = "black";

                            const namesArray = info.event.extendedProps.names;
                            let namesList;

                            if (namesArray.length > 1) {
                                namesList = namesArray
                                    .map(
                                        (name, index) =>
                                            `<li>${index + 1}. ${name}</li>`
                                    )
                                    .join("");
                            } else {
                                namesList = `<li>${namesArray[0]}</li>`;
                            }

                            const popoverContent = `
                            <div className="">
                                <p class="event-title"><strong>Birthdays:</strong></p>
                                <ul>${namesList}</ul>
                            </div>
                        `;

                            new bootstrap.Popover(info.el, {
                                placement: "bottom",
                                trigger: "hover",
                                container: "body",
                                customClass: "custom-popover",
                                content: popoverContent,
                                html: true,
                                offset: "0,10",
                            });
                        } else {
                            const formattedStartTime = new Date(
                                info.event.start
                            ).toLocaleString("en-US", {
                                hour: "numeric",
                                minute: "numeric",
                                hour12: true,
                            });

                            const descContent = info.event.extendedProps
                                .description
                                ? `<p><strong>Description:</strong> ${info.event.extendedProps.description}</p>`
                                : "";

                            const venueContent = info.event.extendedProps.venue
                                ? `<p><strong>Venue:</strong> ${info.event.extendedProps.venue}</p>`
                                : "";

                            const popoverContent = `
                            <div>
                                <p class="event-title"><strong>${info.event.title}</strong></p>
                                <p><strong>Created by:</strong> ${info.event.extendedProps.userName}</p>
                                ${venueContent}
                                ${descContent}
                            </div>`;

                            new bootstrap.Popover(info.el, {
                                placement: "auto",
                                trigger: "hover",
                                container: "body",
                                customClass: "custom-popover",
                                content: popoverContent,
                                html: true,
                            });
                        }
                    }}
                    eventContent={(eventInfo) => {
                        const isBirthday =
                            eventInfo.event.extendedProps.isBirthday;

                        if (isBirthday) {
                            const names =
                                eventInfo.event.extendedProps.names || [];
                            return (
                                <div
                                    key={eventInfo.event.id}
                                    style={{
                                        position: "relative",
                                        height: "100%",
                                        width: "100%",
                                    }}
                                >
                                    <span
                                        role="img"
                                        aria-label="cake"
                                        style={{
                                            position: "absolute",
                                            bottom: "0",
                                            left: "5px",
                                            fontSize: "1.8em",
                                            cursor: "pointer",
                                            zIndex: 1,
                                        }}
                                        title={names.join(", ")}
                                    >
                                        🎂
                                    </span>
                                </div>
                            );
                        } else {
                            const borderColor =
                                eventInfo.event.backgroundColor || "gray";

                            return (
                                <div
                                    key={eventInfo.event.id}
                                    style={{
                                        backgroundColor:
                                            eventInfo.backgroundColor,
                                        padding: "10px 15px",
                                        borderRadius: "2px",
                                        display: "flex",
                                        alignItems: "center",
                                        height: "30px",
                                        width: "100%",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        border: `2px solid ${borderColor}`,
                                    }}
                                    className="fc-event-title"
                                >
                                    <div
                                        style={{
                                            borderLeft: `5px solid ${eventInfo.event.backgroundColor}`,
                                            height: "100%",
                                            opacity: "50%",
                                        }}
                                    />
                                    <span
                                        className="event-title"
                                        style={{ color: "white", flexGrow: 1 }}
                                    >
                                        {eventInfo.event.title}
                                    </span>
                                    <img
                                        src={pencilIcon}
                                        alt="Edit"
                                        className="inline-block w-4 h-4 ml-2 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleEditClick(eventInfo.event);
                                        }}
                                    />
                                </div>
                            );
                        }
                    }}
                />

                <div className="pb-10"></div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="modal-container">
                            <h1 className="flex items-start justify-center mb-4 text-2xl font-bold text-neutral-800">
                                Create New Event
                            </h1>
                            <button
                                onClick={closeModal}
                                className="mt-2 mr-2 modal-close-button"
                            >
                                <img
                                    src="/assets/cancel.svg"
                                    alt="Close icon"
                                    className="w-6 h-6"
                                />
                            </button>
                            <form onSubmit={handleSubmit}>
                                <input
                                    type="text"
                                    name="title"
                                    value={eventData.title}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Event Title"
                                    required
                                />
                                <input
                                    type="text"
                                    name="venue"
                                    value={eventData.venue}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Venue"
                                />
                                <div className="flex items-start font-bold text-md text-neutral-800">
                                    Start Date
                                </div>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={eventData.startDate}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Start Date"
                                    required
                                />
                                <div className="flex items-start text-md font-semibold text-neutral-800">
                                    End Date
                                </div>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={eventData.endDate}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="End Date"
                                    required
                                />
                                <textarea
                                    name="description"
                                    value={eventData.description}
                                    onChange={handleChange}
                                    className="form-control h-36 overflow-y-auto"
                                    placeholder="Description"
                                />
                                <div className="color-picker justify-between">
                                    {[
                                        "red",
                                        "blue",
                                        "green",
                                        "orange",
                                        "purple",
                                        "DeepPink",
                                        "black",
                                        "gray",
                                    ].map((color) => (
                                        <label
                                            key={color}
                                            className="color-option mb-4"
                                        >
                                            <input
                                                type="radio"
                                                name="color"
                                                value={color}
                                                checked={
                                                    eventData.color === color
                                                }
                                                onChange={handleChange}
                                                required
                                            />
                                            <span
                                                className="color-display"
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            ></span>
                                        </label>
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    className="modal-submit-button font-bold"
                                >
                                    Confirm
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="modal-container">
                            <h1 className="flex items-center justify-center mx-4 mb-4 text-2xl font-bold text-neutral-800">
                                Edit Event
                            </h1>
                            <button
                                onClick={closeEditModal}
                                className="mt-2 mr-2 modal-close-button"
                            >
                                <img
                                    src="/assets/cancel.svg"
                                    alt="Close icon"
                                    className="w-6 h-6"
                                />
                            </button>
                            <form onSubmit={handleEditSubmit}>
                                <input
                                    type="text"
                                    name="title"
                                    value={eventData.title}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Event Title"
                                    required
                                />
                                <input
                                    type="text"
                                    name="venue"
                                    value={eventData.venue}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Venue"
                                />
                                <input
                                    type="date"
                                    name="startDate"
                                    value={eventData.startDate}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Start Date"
                                    required
                                />
                                <input
                                    type="date"
                                    name="endDate"
                                    value={eventData.endDate}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="End Date"
                                    required
                                />
                                <input
                                    type="text"
                                    name="description"
                                    value={eventData.description}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Description"
                                />
                                <div className="color-picker justify-between">
                                    {[
                                        "red",
                                        "blue",
                                        "green",
                                        "orange",
                                        "purple",
                                        "DeepPink",
                                        "black",
                                        "gray",
                                    ].map((color) => (
                                        <label
                                            key={color}
                                            className="color-option mb-3"
                                        >
                                            <input
                                                type="radio"
                                                name="color"
                                                value={color}
                                                onChange={handleChange}
                                                required
                                                checked={
                                                    eventData.color === color
                                                }
                                            />
                                            <span
                                                className="color-display"
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            ></span>
                                        </label>
                                    ))}
                                </div>
                                <div className="button-container">
                                    <button
                                        type="button"
                                        className="modal-delete-button font-bold"
                                        onClick={handleDelete}
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="submit"
                                        className="modal-save-button font-bold"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isPrintModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="w-full max-w-md max-md:w-[340px] p-6 mx-auto bg-white rounded-2xl shadow-lg">
                            <h2 className="mb-4 text-xl font-bold">
                                Select Date Range for Printing
                            </h2>
                            <form onSubmit={handlePrintSubmit}>
                                <div className="mb-2">
                                    <label
                                        className="block mb-2 font-bold text-gray-700 text-md"
                                        htmlFor="startDate"
                                    >
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        id="startDate"
                                        value={printRange.startDate}
                                        onChange={handlePrintRangeChange}
                                        className="w-full p-2 border border-gray-300 rounded"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label
                                        className="block mb-2 font-bold text-gray-700 text-md"
                                        htmlFor="endDate"
                                    >
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        id="endDate"
                                        value={printRange.endDate}
                                        onChange={handlePrintRangeChange}
                                        className="w-full p-2 border border-gray-300 rounded"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={closePrintModal}
                                        className="px-4 py-2 mr-2 text-gray-400 border-2 border-gray-400 rounded-full hover:bg-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-white bg-blue-500 rounded-full hover:bg-blue-700"
                                    >
                                        Print
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showPrint && (
                    <PrintCalendar
                        events={filteredEvents}
                        refetchEvents={fetchEvents}
                    />
                )}
            </div>
        </Example>
    );
}

export default Calendar;
