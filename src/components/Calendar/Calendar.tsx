'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export function Calendar() {
  return (
    <div>
      <header>
        <h2>2026 March</h2>
        <button>
          <ChevronLeftIcon size={24} />
        </button>
        <button>
          <ChevronRightIcon size={24} />
        </button>
      </header>
      <div>
        <table>
          <thead>
            <tr>
              <th>Sun</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <button>1</button>
              </td>
              <td>
                <button>2</button>
              </td>
              <td>
                <button>3</button>
              </td>
              <td>
                <button>4</button>
              </td>
              <td>
                <button>5</button>
              </td>
              <td>
                <button>6</button>
              </td>
              <td>
                <button>7</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
